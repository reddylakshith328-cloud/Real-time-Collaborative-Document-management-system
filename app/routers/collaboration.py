from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from ..database import get_db

from ..models import (
    Document,
    DocumentCollaborator,
    User
)

from ..services.security_service import (
    get_current_user
)

from ..services.notification_service import (
    create_notification
)

from ..mongodb import (
    audit_collection
)


router = APIRouter(
    prefix="/documents",
    tags=["Collaboration"]
)


# ============================================================
# HELPER
# ============================================================

def get_document_or_404(
    db: Session,
    document_id: int
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

    return document


# ============================================================
# ADD COLLABORATOR
# ============================================================

@router.post(
    "/{document_id}/collaborators"
)
def add_collaborator(
    document_id: int,
    user_id: int,
    permission: str = "viewer",
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    document = get_document_or_404(
        db,
        document_id
    )

    # Only document owner can add collaborators
    if document.owner_id != current_user.id:

        raise HTTPException(
            status_code=403,
            detail="Only the document owner can manage collaborators"
        )

    # Validate permission
    if permission not in [
        "viewer",
        "editor"
    ]:

        raise HTTPException(
            status_code=400,
            detail="Permission must be viewer or editor"
        )

    # Check user
    user = (
        db.query(User)
        .filter(
            User.id == user_id
        )
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    # Owner cannot be added as collaborator
    if user_id == document.owner_id:

        raise HTTPException(
            status_code=400,
            detail="Document owner is already the owner"
        )

    # Check existing collaborator
    existing = (
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

    if existing:

        raise HTTPException(
            status_code=400,
            detail="User is already a collaborator"
        )

    # Create collaborator
    collaborator = DocumentCollaborator(

        document_id=document_id,

        user_id=user_id,

        permission=permission
    )

    db.add(
        collaborator
    )

    db.commit()

    db.refresh(
        collaborator
    )

    # ========================================================
    # KAFKA NOTIFICATION
    # ========================================================

    create_notification(

        user_id=user_id,

        title="Document Shared",

        message=(
            f"You have been added as a "
            f"{permission} to document "
            f"'{document.title}'."
        ),

        notification_type="collaboration",

        document_id=document_id
    )

    # ========================================================
    # AUDIT LOG
    # ========================================================

    audit_collection.insert_one({

        "document_id":
            document_id,

        "user_id":
            current_user.id,

        "action":
            "COLLABORATOR_ADDED",

        "target_user_id":
            user_id,

        "permission":
            permission,

        "created_at":
            datetime.now(
                timezone.utc
            )
    })

    return {

        "message":
            "Collaborator added successfully",

        "document_id":
            document_id,

        "user_id":
            user_id,

        "permission":
            permission,

        "notification":
            "Published to Kafka"
    }


# ============================================================
# GET COLLABORATORS
# ============================================================

@router.get(
    "/{document_id}/collaborators"
)
def get_collaborators(
    document_id: int,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    document = get_document_or_404(
        db,
        document_id
    )

    # Check access
    if document.owner_id != current_user.id:

        access = (
            db.query(
                DocumentCollaborator
            )
            .filter(
                DocumentCollaborator.document_id
                == document_id,

                DocumentCollaborator.user_id
                == current_user.id
            )
            .first()
        )

        if not access:

            raise HTTPException(
                status_code=403,
                detail="You do not have access to this document"
            )

    collaborators = (
        db.query(
            DocumentCollaborator
        )
        .filter(
            DocumentCollaborator.document_id
            == document_id
        )
        .all()
    )

    result = []

    for collaborator in collaborators:

        user = (
            db.query(User)
            .filter(
                User.id ==
                collaborator.user_id
            )
            .first()
        )

        result.append({

            "user_id":
                collaborator.user_id,

            "email":
                user.email
                if user
                else None,

            "permission":
                collaborator.permission
        })

    return result


# ============================================================
# UPDATE COLLABORATOR PERMISSION
# ============================================================

@router.put(
    "/{document_id}/collaborators/{user_id}"
)
def update_collaborator(
    document_id: int,
    user_id: int,
    permission: str,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    document = get_document_or_404(
        db,
        document_id
    )

    # Only owner can update collaborators
    if document.owner_id != current_user.id:

        raise HTTPException(
            status_code=403,
            detail="Only the document owner can manage collaborators"
        )

    # Validate permission
    if permission not in [
        "viewer",
        "editor"
    ]:

        raise HTTPException(
            status_code=400,
            detail="Permission must be viewer or editor"
        )

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
            status_code=404,
            detail="Collaborator not found"
        )

    old_permission = (
        collaborator.permission
    )

    collaborator.permission = (
        permission
    )

    db.commit()

    db.refresh(
        collaborator
    )

    # ========================================================
    # KAFKA NOTIFICATION
    # ========================================================

    create_notification(

        user_id=user_id,

        title="Permission Updated",

        message=(
            f"Your permission for "
            f"document '{document.title}' "
            f"was changed from "
            f"{old_permission} to "
            f"{permission}."
        ),

        notification_type="collaboration",

        document_id=document_id
    )

    # ========================================================
    # AUDIT LOG
    # ========================================================

    audit_collection.insert_one({

        "document_id":
            document_id,

        "user_id":
            current_user.id,

        "action":
            "COLLABORATOR_PERMISSION_UPDATED",

        "target_user_id":
            user_id,

        "old_permission":
            old_permission,

        "new_permission":
            permission,

        "created_at":
            datetime.now(
                timezone.utc
            )
    })

    return {

        "message":
            "Collaborator permission updated successfully",

        "document_id":
            document_id,

        "user_id":
            user_id,

        "permission":
            permission,

        "notification":
            "Published to Kafka"
    }


# ============================================================
# REMOVE COLLABORATOR
# ============================================================

@router.delete(
    "/{document_id}/collaborators/{user_id}"
)
def remove_collaborator(
    document_id: int,
    user_id: int,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    document = get_document_or_404(
        db,
        document_id
    )

    # Only owner can remove collaborators
    if document.owner_id != current_user.id:

        raise HTTPException(
            status_code=403,
            detail="Only the document owner can manage collaborators"
        )

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
            status_code=404,
            detail="Collaborator not found"
        )

    db.delete(
        collaborator
    )

    db.commit()

    # ========================================================
    # KAFKA NOTIFICATION
    # ========================================================

    create_notification(

        user_id=user_id,

        title="Access Removed",

        message=(
            f"Your access to document "
            f"'{document.title}' has been removed."
        ),

        notification_type="collaboration",

        document_id=document_id
    )

    # ========================================================
    # AUDIT LOG
    # ========================================================

    audit_collection.insert_one({

        "document_id":
            document_id,

        "user_id":
            current_user.id,

        "action":
            "COLLABORATOR_REMOVED",

        "target_user_id":
            user_id,

        "created_at":
            datetime.now(
                timezone.utc
            )
    })

    return {

        "message":
            "Collaborator removed successfully",

        "document_id":
            document_id,

        "user_id":
            user_id,

        "notification":
            "Published to Kafka"
    }