import os

from datetime import (
    datetime,
    timedelta,
    timezone
)

import bcrypt

from jose import jwt


ALGORITHM = "HS256"


def hash_password(
    password: str
) -> str:

    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(
    password: str,
    hashed_password: str
) -> bool:

    return bcrypt.checkpw(
        password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


def create_access_token(
    user_id: int,
    role: str
) -> str:

    secret_key = os.getenv(
        "SECRET_KEY"
    )

    expire = (
        datetime.now(timezone.utc)
        + timedelta(hours=2)
    )

    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": expire
    }

    return jwt.encode(
        payload,
        secret_key,
        algorithm=ALGORITHM
    )