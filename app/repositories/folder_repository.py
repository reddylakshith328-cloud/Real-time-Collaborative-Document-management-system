from sqlalchemy.orm import Session

from ..models import Folder


def create_folder(
    db: Session,
    name: str,
    owner_id: int
):

    folder = Folder(
        name=name,
        owner_id=owner_id
    )

    db.add(folder)

    db.commit()

    db.refresh(folder)

    return folder


def get_folders(
    db: Session
):

    return db.query(
        Folder
    ).all()