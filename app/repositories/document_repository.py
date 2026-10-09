from sqlalchemy.orm import Session

from ..models import Document


def create_document(
    db: Session,
    title: str,
    description: str,
    file_type: str,
    owner_id: int,
    folder_id: int
):

    document = Document(
        title=title,
        description=description,
        file_type=file_type,
        owner_id=owner_id,
        folder_id=folder_id,
        status="Pending"
    )

    db.add(document)

    db.commit()

    db.refresh(document)

    return document


def get_documents(
    db: Session
):

    return db.query(
        Document
    ).all()


def get_document(
    db: Session,
    document_id: int
):

    return (
        db.query(Document)
        .filter(
            Document.id == document_id
        )
        .first()
    )


def update_document_status(
    db: Session,
    document_id: int,
    status: str
):

    document = get_document(
        db,
        document_id
    )

    if document:

        document.status = status

        db.commit()

        db.refresh(document)

    return document