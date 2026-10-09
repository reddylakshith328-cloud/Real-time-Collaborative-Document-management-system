from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from ..database import get_db

from ..models import (
    Folder,
    Document
)

from ..schemas import FolderCreate

from ..services.security_service import (
    get_current_user
)


router = APIRouter(
    prefix="/folders",
    tags=["Folders"]
)


# ============================================================
# CREATE FOLDER
# ============================================================

@router.post("/")
def create_folder(
    folder_data: FolderCreate,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    folder = Folder(
        name=folder_data.name,
        owner_id=current_user.id
    )

    db.add(folder)

    db.commit()

    db.refresh(folder)

    return {
        "message":
            "Folder created successfully",

        "folder_id":
            folder.id,

        "name":
            folder.name,

        "owner_id":
            current_user.id
    }


# ============================================================
# GET FOLDERS
# ============================================================

@router.get("/")
def get_folders(
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    folders = (
        db.query(Folder)
        .filter(
            Folder.owner_id ==
            current_user.id
        )
        .all()
    )

    return [
        {
            "id":
                folder.id,

            "name":
                folder.name,

            "owner_id":
                folder.owner_id
        }

        for folder in folders
    ]


# ============================================================
# DELETE FOLDER
# ============================================================

@router.delete("/{folder_id}")
def delete_folder(
    folder_id: int,
    current_user=Depends(
        get_current_user
    ),
    db: Session = Depends(get_db)
):

    # Find folder

    folder = (
        db.query(Folder)
        .filter(
            Folder.id ==
            folder_id
        )
        .first()
    )

    if not folder:

        raise HTTPException(
            status_code=404,
            detail="Folder not found"
        )


    # Only folder owner can delete

    if folder.owner_id != current_user.id:

        raise HTTPException(
            status_code=403,
            detail="Only the folder owner can delete this folder"
        )


    # Keep documents safe.
    # Remove their folder association.

    db.query(Document).filter(
        Document.folder_id ==
        folder_id
    ).update(
        {
            Document.folder_id: None
        },
        synchronize_session=False
    )


    # Delete folder

    db.delete(folder)

    db.commit()


    return {
        "message":
            "Folder deleted successfully",

        "folder_id":
            folder_id
    }