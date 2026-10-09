import os

from fastapi import (
    Depends,
    HTTPException,
    status
)

from fastapi.security import (
    OAuth2PasswordBearer
)

from jose import (
    jwt,
    JWTError
)

from sqlalchemy.orm import Session

from ..database import get_db

from ..repositories.user_repository import (
    get_user_by_id
)


ALGORITHM = "HS256"


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="auth/login"
)


def get_current_user(
    token: str = Depends(
        oauth2_scheme
    ),
    db: Session = Depends(get_db)
):

    secret_key = os.getenv(
        "SECRET_KEY"
    )

    try:

        payload = jwt.decode(
            token,
            secret_key,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get(
            "sub"
        )

        if user_id is None:

            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )

        user = get_user_by_id(
            db,
            int(user_id)
        )

        if user is None:

            raise HTTPException(
                status_code=401,
                detail="User not found"
            )

        return user

    except (
        JWTError,
        ValueError
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )


def admin_required(
    current_user=Depends(
        get_current_user
    )
):

    if current_user.role.lower() != "admin":

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user