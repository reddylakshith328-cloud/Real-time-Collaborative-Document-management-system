import os
from pathlib import Path
from uuid import uuid4
from fastapi import File, UploadFile
from fastapi.responses import FileResponse
from datetime import (
    datetime,
    timezone
)

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    WebSocket,
    WebSocketDisconnect
)

from jose import (
    jwt,
    JWTError
)

from sqlalchemy import text

from sqlalchemy.orm import Session

from ..database import (
    get_db,
    SessionLocal
)

from ..models import (
    Document,
    DocumentCollaborator,
    Comment
)

from ..schemas import (
    DocumentCreate
)

from ..services.security_service import (
    get_current_user,
    admin_required
)

from ..services.embedding_service import (
    generate_embedding
)

from ..mongodb import (
    documents_collection,
    versions_collection,
    audit_collection,
    notifications_collection
)

from ..services.collaboration_manager import (
    collaboration_manager as manager
)


router = APIRouter(
    prefix="/documents",
    tags=["Documents"]
)


# ============================================================
# HELPER FUNCTIONS
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


def check_document_access(
    db: Session,
    document_id: int,
    user_id: int
):

    document = get_document_or_404(
        db,
        document_id
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
            detail=(
                "You do not have access "
                "to this document"
            )
        )

    return document


def check_edit_permission(
    db: Session,
    document_id: int,
    user_id: int
):

    document = get_document_or_404(
        db,
        document_id
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
            detail=(
                "You do not have access "
                "to this document"
            )
        )

    if collaborator.permission != "editor":

        raise HTTPException(
            status_code=403,
            detail="Editor permission required"
        )

    return document


# ============================================================
# CREATE DOCUMENT
# ============================================================

@router.post("/")
def create_document(

    document_data: DocumentCreate,

    current_user=Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    )
):

    document = Document(

        title=document_data.title,

        description=document_data.description,

        file_type=document_data.file_type,

        folder_id=document_data.folder_id,

        owner_id=current_user.id,

        status="Pending"
    )

    db.add(
        document
    )

    db.commit()

    db.refresh(
        document
    )

    content = (
        document_data.content
        or ""
    )


    # ========================================================
    # GENERATE VECTOR EMBEDDING
    # ========================================================

    embedding = generate_embedding(
        content
    )


    if embedding:

        db.execute(

            text(
                """
                UPDATE documents

                SET embedding =
                    CAST(
                        :embedding
                        AS vector
                    )

                WHERE id =
                    :document_id
                """
            ),

            {
                "embedding":
                    str(embedding),

                "document_id":
                    document.id
            }
        )

        db.commit()


    # ========================================================
    # MONGODB DOCUMENT
    # ========================================================

    documents_collection.insert_one({

        "document_id":
            document.id,

        "title":
            document.title,

        "content":
            content,

        "owner_id":
            current_user.id,

        "created_at":
            datetime.now(
                timezone.utc
            ),

        "updated_at":
            datetime.now(
                timezone.utc
            )
    })


    # ========================================================
    # INITIAL VERSION
    # ========================================================

    versions_collection.insert_one({

        "document_id":
            document.id,

        "version":
            1,

        "content":
            content,

        "created_by":
            current_user.id,

        "created_at":
            datetime.now(
                timezone.utc
            )
    })


    # ========================================================
    # AUDIT
    # ========================================================

    audit_collection.insert_one({

        "document_id":
            document.id,

        "user_id":
            current_user.id,

        "action":
            "DOCUMENT_CREATED",

        "version":
            1,

        "created_at":
            datetime.now(
                timezone.utc
            )
    })


    return {

        "message":
            "Document created successfully",

        "document_id":
            document.id,

        "title":
            document.title,

        "status":
            document.status,

        "created_by":
            current_user.email,

        "embedding_generated":
            embedding is not None
    }


# ============================================================
# GET DOCUMENTS
# ============================================================

@router.get("/")
def get_documents(

    current_user=Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    )
):

    documents = (

        db.query(Document)

        .filter(
            Document.owner_id
            == current_user.id
        )

        .all()
    )


    collaborator_documents = (

        db.query(Document)

        .join(

            DocumentCollaborator,

            Document.id
            ==
            DocumentCollaborator.document_id
        )

        .filter(

            DocumentCollaborator.user_id
            ==
            current_user.id
        )

        .all()
    )


    all_documents = {

        document.id:
            document

        for document in (

            documents
            +
            collaborator_documents
        )
    }


    return [

        {

            "id":
                document.id,

            "title":
                document.title,

            "description":
                document.description,

            "file_type":
                document.file_type,

            "owner_id":
                document.owner_id,

            "folder_id":
                document.folder_id,

            "status":
                document.status

        }

        for document
        in all_documents.values()

    ]


# ============================================================
# KEYWORD SEARCH
# ============================================================

@router.get(
    "/search"
)
def search_documents(

    q: str,

    current_user=Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    )
):

    search_text = (
        f"%{q}%"
    )


    documents = (

        db.query(Document)

        .filter(

            Document.title.ilike(
                search_text
            )
        )

        .all()
    )


    return [

        {

            "id":
                document.id,

            "title":
                document.title,

            "description":
                document.description,

            "file_type":
                document.file_type,

            "status":
                document.status

        }

        for document
        in documents

    ]


# ============================================================
# GET SINGLE DOCUMENT
# ============================================================

@router.get(
    "/{document_id}"
)
def get_document(

    document_id: int,

    current_user=Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    )
):

    document = check_document_access(

        db,

        document_id,

        current_user.id
    )


    mongo_document = (

        documents_collection.find_one(

            {
                "document_id":
                    document_id
            },

            {
                "_id":
                    0
            }
        )
    )


    return {

        "id":
            document.id,

        "title":
            document.title,

        "description":
            document.description,

        "file_type":
            document.file_type,

        "owner_id":
            document.owner_id,

        "folder_id":
            document.folder_id,

        "status":
            document.status,

        "content":

            (

                mongo_document.get(
                    "content",
                    ""
                )

                if mongo_document

                else ""
            )
    }


# ============================================================
# UPDATE DOCUMENT
# ============================================================

@router.put(
    "/{document_id}"
)
def update_document(

    document_id: int,

    document_data: DocumentCreate,

    current_user=Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    )
):

    document = check_edit_permission(

        db,

        document_id,

        current_user.id
    )


    document.title = (
        document_data.title
    )

    document.description = (
        document_data.description
    )

    document.file_type = (
        document_data.file_type
    )

    document.folder_id = (
        document_data.folder_id
    )


    db.commit()

    db.refresh(
        document
    )


    # ========================================================
    # UPDATE CONTENT + EMBEDDING
    # ========================================================

    if document_data.content is not None:

        content = (
            document_data.content
        )


        # ----------------------------------------------------
        # GENERATE NEW EMBEDDING
        # ----------------------------------------------------

        embedding = generate_embedding(
            content
        )


        if embedding:

            db.execute(

                text(
                    """
                    UPDATE documents

                    SET embedding =
                        CAST(
                            :embedding
                            AS vector
                        )

                    WHERE id =
                        :document_id
                    """
                ),

                {
                    "embedding":
                        str(embedding),

                    "document_id":
                        document_id
                }
            )

            db.commit()


        # ----------------------------------------------------
        # FIND NEXT VERSION
        # ----------------------------------------------------

        latest = (

            versions_collection.find_one(

                {
                    "document_id":
                        document_id
                },

                sort=[
                    (
                        "version",
                        -1
                    )
                ]
            )
        )


        next_version = (

            latest["version"] + 1

            if latest

            else 1
        )


        # ----------------------------------------------------
        # UPDATE MONGODB DOCUMENT
        # ----------------------------------------------------

        documents_collection.update_one(

            {
                "document_id":
                    document_id
            },

            {
                "$set": {

                    "content":
                        content,

                    "updated_by":
                        current_user.id,

                    "updated_at":
                        datetime.now(
                            timezone.utc
                        )
                }
            },

            upsert=True
        )


        # ----------------------------------------------------
        # CREATE VERSION
        # ----------------------------------------------------

        versions_collection.insert_one({

            "document_id":
                document_id,

            "version":
                next_version,

            "content":
                content,

            "created_by":
                current_user.id,

            "created_at":
                datetime.now(
                    timezone.utc
                )
        })


        # ----------------------------------------------------
        # AUDIT
        # ----------------------------------------------------

        audit_collection.insert_one({

            "document_id":
                document_id,

            "user_id":
                current_user.id,

            "action":
                "DOCUMENT_UPDATED",

            "version":
                next_version,

            "created_at":
                datetime.now(
                    timezone.utc
                )
        })


    return {

        "message":
            "Document updated successfully",

        "document_id":
            document.id,

        "updated_by":
            current_user.email,

        "status":
            document.status,

        "embedding_updated":
            document_data.content is not None
    }


# ============================================================
# DELETE DOCUMENT
# ============================================================

@router.delete(
    "/{document_id}"
)
def delete_document(

    document_id: int,

    current_user=Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    )
):

    document = get_document_or_404(

        db,

        document_id
    )


    if document.owner_id != current_user.id:

        raise HTTPException(

            status_code=403,

            detail=(
                "Only the document owner "
                "can delete it"
            )
        )


    db.delete(
        document
    )

    db.commit()


    documents_collection.delete_many({

        "document_id":
            document_id
    })


    versions_collection.delete_many({

        "document_id":
            document_id
    })


    audit_collection.insert_one({

        "document_id":
            document_id,

        "user_id":
            current_user.id,

        "action":
            "DOCUMENT_DELETED",

        "created_at":
            datetime.now(
                timezone.utc
            )
    })


    return {

        "message":
            "Document deleted successfully",

        "document_id":
            document_id,

        "deleted_by":
            current_user.email
    }


# ============================================================
# APPROVE DOCUMENT
# ============================================================

@router.put(
    "/{document_id}/approve"
)
def approve_document(

    document_id: int,

    admin=Depends(
        admin_required
    ),

    db: Session = Depends(
        get_db
    )
):

    document = get_document_or_404(

        db,

        document_id
    )


    document.status = (
        "Approved"
    )


    db.commit()

    db.refresh(
        document
    )


    audit_collection.insert_one({

        "document_id":
            document_id,

        "user_id":
            admin.id,

        "action":
            "DOCUMENT_APPROVED",

        "created_at":
            datetime.now(
                timezone.utc
            )
    })


    return {

        "message":
            "Document approved successfully",

        "document_id":
            document.id,

        "status":
            document.status,

        "approved_by":
            admin.email
    }


# ============================================================
# VERSION HISTORY
# ============================================================

@router.get(
    "/{document_id}/versions"
)
def get_versions(

    document_id: int,

    current_user=Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    )
):

    check_document_access(

        db,

        document_id,

        current_user.id
    )


    versions = list(

        versions_collection.find(

            {
                "document_id":
                    document_id
            },

            {
                "_id":
                    0
            }

        ).sort(

            "version",

            -1
        )
    )


    return versions


# ============================================================
# ACTIVITY HISTORY
# ============================================================

@router.get(
    "/{document_id}/activity"
)
def get_activity(

    document_id: int,

    current_user=Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    )
):

    check_document_access(

        db,

        document_id,

        current_user.id
    )


    activity = list(

        audit_collection.find(

            {
                "document_id":
                    document_id
            },

            {
                "_id":
                    0
            }

        ).sort(

            "created_at",

            -1
        )
    )


    return activity


# ============================================================
# WEBSOCKET REAL-TIME COLLABORATION
# ============================================================

@router.websocket(
    "/ws/{document_id}"
)
async def document_websocket(

    websocket: WebSocket,

    document_id: int
):

    token = (
        websocket.query_params.get(
            "token"
        )
    )


    if not token:

        await websocket.close(
            code=1008
        )

        return


    secret_key = os.getenv(
        "SECRET_KEY"
    )


    try:

        payload = jwt.decode(

            token,

            secret_key,

            algorithms=[
                "HS256"
            ]
        )


        user_id = payload.get(
            "sub"
        )


        if user_id is None:

            await websocket.close(
                code=1008
            )

            return


        user_id = int(
            user_id
        )


    except (
        JWTError,
        ValueError
    ):

        await websocket.close(
            code=1008
        )

        return


    db = SessionLocal()


    try:

        # ====================================================
        # CHECK DOCUMENT
        # ====================================================

        document = (

            db.query(Document)

            .filter(

                Document.id
                ==
                document_id
            )

            .first()
        )


        if not document:

            await websocket.close(
                code=1008
            )

            return


        # ====================================================
        # CHECK ACCESS
        # ====================================================

        has_access = (

            document.owner_id
            ==
            user_id
        )


        collaborator = None


        if not has_access:

            collaborator = (

                db.query(
                    DocumentCollaborator
                )

                .filter(

                    DocumentCollaborator.document_id
                    ==
                    document_id,

                    DocumentCollaborator.user_id
                    ==
                    user_id
                )

                .first()
            )


            has_access = (

                collaborator
                is not None
            )


        if not has_access:

            await websocket.close(
                code=1008
            )

            return


        # ====================================================
        # CONNECT
        # ====================================================

        await manager.connect(

            document_id,

            websocket,

            user_id
        )


        # ====================================================
        # GET CURRENT CONTENT
        # ====================================================

        current_document = (

            documents_collection.find_one(

                {
                    "document_id":
                        document_id
                },

                {
                    "_id":
                        0
                }
            )
        )


        # ====================================================
        # SEND INITIAL DOCUMENT
        # ====================================================

        await websocket.send_json({

            "type":
                "initial_document",

            "document_id":
                document_id,

            "content":

                (

                    current_document.get(
                        "content",
                        ""
                    )

                    if current_document

                    else ""
                ),

            "online_users":
                manager.get_online_users(
                    document_id
                ),

            "online_count":
                manager.get_online_count(
                    document_id
                )
        })


        # ====================================================
        # NOTIFY OTHER USERS
        # ====================================================

        await manager.broadcast(

            document_id,

            {

                "type":
                    "presence",

                "event":
                    "user_joined",

                "user_id":
                    user_id,

                "online_users":
                    manager.get_online_users(
                        document_id
                    ),

                "online_count":
                    manager.get_online_count(
                        document_id
                    )
            },

            exclude=websocket
        )


        # ====================================================
        # MESSAGE LOOP
        # ====================================================

        while True:

            data = (
                await websocket.receive_json()
            )


            message_type = data.get(
                "type"
            )


            # =================================================
            # TYPING INDICATOR
            # =================================================

            if message_type == "typing":

                await manager.broadcast(

                    document_id,

                    {

                        "type":
                            "typing",

                        "user_id":
                            user_id,

                        "is_typing":
                            data.get(
                                "is_typing",
                                False
                            )
                    },

                    exclude=websocket
                )


            # =================================================
            # REAL-TIME EDITING
            # =================================================

            elif message_type == "edit":

                content = data.get(
                    "content",
                    ""
                )


                # ---------------------------------------------
                # CHECK EDIT PERMISSION
                # ---------------------------------------------

                can_edit = (

                    document.owner_id
                    ==
                    user_id
                )


                if not can_edit:

                    collaborator = (

                        db.query(
                            DocumentCollaborator
                        )

                        .filter(

                            DocumentCollaborator.document_id
                            ==
                            document_id,

                            DocumentCollaborator.user_id
                            ==
                            user_id
                        )

                        .first()
                    )


                    can_edit = (

                        collaborator
                        is not None

                        and

                        collaborator.permission
                        ==
                        "editor"
                    )


                if not can_edit:

                    await websocket.send_json({

                        "type":
                            "error",

                        "message":
                            "Editor permission required"
                    })

                    continue


                # ---------------------------------------------
                # FIND NEXT VERSION
                # ---------------------------------------------

                latest = (

                    versions_collection.find_one(

                        {
                            "document_id":
                                document_id
                        },

                        sort=[

                            (
                                "version",
                                -1
                            )

                        ]
                    )
                )


                next_version = (

                    latest["version"] + 1

                    if latest

                    else 1
                )


                now = datetime.now(
                    timezone.utc
                )


                # ---------------------------------------------
                # GENERATE NEW EMBEDDING
                # ---------------------------------------------

                embedding = generate_embedding(
                    content
                )


                if embedding:

                    db.execute(

                        text(
                            """
                            UPDATE documents

                            SET embedding =
                                CAST(
                                    :embedding
                                    AS vector
                                )

                            WHERE id =
                                :document_id
                            """
                        ),

                        {

                            "embedding":
                                str(
                                    embedding
                                ),

                            "document_id":
                                document_id
                        }
                    )

                    db.commit()


                # ---------------------------------------------
                # UPDATE MONGODB CONTENT
                # ---------------------------------------------

                documents_collection.update_one(

                    {
                        "document_id":
                            document_id
                    },

                    {
                        "$set": {

                            "content":
                                content,

                            "updated_by":
                                user_id,

                            "updated_at":
                                now
                        }
                    },

                    upsert=True
                )


                # ---------------------------------------------
                # SAVE VERSION
                # ---------------------------------------------

                versions_collection.insert_one({

                    "document_id":
                        document_id,

                    "version":
                        next_version,

                    "content":
                        content,

                    "created_by":
                        user_id,

                    "created_at":
                        now
                })


                # ---------------------------------------------
                # AUDIT
                # ---------------------------------------------

                audit_collection.insert_one({

                    "document_id":
                        document_id,

                    "user_id":
                        user_id,

                    "action":
                        "REAL_TIME_EDIT",

                    "version":
                        next_version,

                    "created_at":
                        now
                })


                # ---------------------------------------------
                # BROADCAST UPDATE
                # ---------------------------------------------

                await manager.broadcast(

                    document_id,

                    {

                        "type":
                            "document_update",

                        "document_id":
                            document_id,

                        "content":
                            content,

                        "version":
                            next_version,

                        "updated_by":
                            user_id
                    },

                    exclude=websocket
                )


            # =================================================
            # REAL-TIME COMMENT
            # =================================================

            elif message_type == "comment":

                comment_text = (

                    data.get(
                        "content",
                        ""
                    )

                    .strip()
                )


                if not comment_text:

                    continue


                comment = Comment(

                    document_id=
                        document_id,

                    user_id=
                        user_id,

                    content=
                        comment_text
                )


                db.add(
                    comment
                )

                db.commit()

                db.refresh(
                    comment
                )


                now = datetime.now(
                    timezone.utc
                )


                audit_collection.insert_one({

                    "document_id":
                        document_id,

                    "user_id":
                        user_id,

                    "action":
                        "REAL_TIME_COMMENT",

                    "comment_id":
                        comment.id,

                    "created_at":
                        now
                })


                await manager.broadcast(

                    document_id,

                    {

                        "type":
                            "new_comment",

                        "comment_id":
                            comment.id,

                        "user_id":
                            user_id,

                        "content":
                            comment_text,

                        "created_at":
                            now.isoformat()
                    }
                )


    except WebSocketDisconnect:

        manager.disconnect(

            document_id,

            websocket
        )


        await manager.broadcast(

            document_id,

            {

                "type":
                    "presence",

                "event":
                    "user_left",

                "user_id":
                    user_id,

                "online_users":
                    manager.get_online_users(
                        document_id
                    ),

                "online_count":
                    manager.get_online_count(
                        document_id
                    )
            }
        )


    finally:

        db.close()