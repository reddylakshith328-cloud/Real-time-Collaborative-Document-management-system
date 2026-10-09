from sqlalchemy.orm import Session

from ..models import User

from ..repositories.user_repository import (
    get_user_by_email
)

from .auth_service import (
    hash_password
)


def register_user(
    db: Session,
    name: str,
    email: str,
    password: str,
    role: str = "Viewer"
):

    existing_user = get_user_by_email(
        db,
        email
    )

    if existing_user:
        return None

    user = User(
        name=name,
        email=email,
        password=hash_password(password),
        role=role
    )

    db.add(user)

    db.commit()

    db.refresh(user)

    return user