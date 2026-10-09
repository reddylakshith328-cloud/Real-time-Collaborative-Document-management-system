from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from ..database import get_db

from ..models import (
    Comment,
    Document,
    DocumentCollaborator
)

from ..schemas import CommentCreate

from ..services.security_service import (
    get_current_user
)

from ..mongodb import audit_collection


router = APIRouter(
    prefix="/documents",
    tags=["Comments"]
)


def check_access(
    db: Session,
    document_id: int,
    user_id: int
):

    document = (
        db.query(Document)
        .filter(
            Document.id == document_id
        )
        .first()
    )

    if not document:

        raise HTTPException(
            status_code=404,
            detail="Document not found"
        )

    if document.owner_id == user_id:
        return document

    collaborator = (
        db.query(
            DocumentCollaborator
        )
        .filter(
            DocumentCollaborator.document_id
            == document_id,

            DocumentCollaborator.user_id
            == user_id
        )
        .first()
    )

    if not collaborator:

        raise HTTPException(
            status_code=403,
            detail="You do not have access to this document"
        )

    return document


@router.post(
    "/{document_id}/comments"
)
def create_comment(
    document_id: int,
    data: CommentCreate,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    check_access(
        db,
        document_id,
        current_user.id
    )

    comment = Comment(
        document_id=document_id,
        user_id=current_user.id,
        content=data.content
    )

    db.add(comment)

    db.commit()

    db.refresh(comment)

    audit_collection.insert_one({
        "document_id": document_id,
        "user_id": current_user.id,
        "action": "COMMENT_ADDED",
        "comment_id": comment.id,
        "created_at": datetime.now(
            timezone.utc
        )
    })

    return {
        "id": comment.id,
        "document_id": document_id,
        "user_id": current_user.id,
        "user_name": current_user.name,
        "content": comment.content,
        "created_at": comment.created_at
    }


@router.get(
    "/{document_id}/comments"
)
def get_comments(
    document_id: int,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    check_access(
        db,
        document_id,
        current_user.id
    )

    comments = (
        db.query(Comment)
        .filter(
            Comment.document_id ==
            document_id
        )
        .order_by(
            Comment.created_at.asc()
        )
        .all()
    )

    return [
        {
            "id": comment.id,
            "document_id":
                comment.document_id,
            "user_id":
                comment.user_id,
            "content":
                comment.content,
            "created_at":
                comment.created_at
        }
        for comment in comments
    ]