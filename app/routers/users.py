from fastapi import (
    APIRouter,
    Depends
)

from sqlalchemy.orm import Session

from ..database import get_db

from ..repositories.user_repository import (
    get_all_users
)

from ..services.security_service import (
    get_current_user
)


router = APIRouter(
    prefix="/users",
    tags=["Users"]
)


@router.get("/")
def get_users(
    db: Session = Depends(get_db),
    current_user=Depends(
        get_current_user
    )
):

    users = get_all_users(db)

    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role
        }
        for user in users
    ]