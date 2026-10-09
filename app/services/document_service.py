from sqlalchemy.orm import Session

from ..repositories.document_repository import (
    create_document,
    get_documents,
    update_document_status
)

from ..mongodb import (
    documents_collection,
    versions_collection,
    audit_collection
)


def create_document_service(
    db: Session,
    title: str,
    description: str,
    file_type: str,
    owner_id: int,
    folder_id: int,
    content: str
):
    document = create_document(
        db,
        title,
        description,
        file_type,
        owner_id,
        folder_id
    )

    documents_collection.insert_one({
        "document_id": document.id,
        "title": title,
        "content": content or "",
        "owner_id": owner_id
    })

    versions_collection.insert_one({
        "document_id": document.id,
        "version": 1,
        "content": content or "",
        "created_by": owner_id
    })

    audit_collection.insert_one({
        "document_id": document.id,
        "user_id": owner_id,
        "action": "DOCUMENT_CREATED"
    })

    return document


def list_documents_service(db: Session):
    return get_documents(db)


def change_status_service(
    db: Session,
    document_id: int,
    status: str,
    user_id: int
):
    document = update_document_status(
        db,
        document_id,
        status
    )

    if document:
        audit_collection.insert_one({
            "document_id": document_id,
            "user_id": user_id,
            "action": f"STATUS_CHANGED_TO_{status.upper()}"
        })

    return document