from fastapi import APIRouter, Depends, HTTPException

from fastapi.security import OAuth2PasswordRequestForm

from sqlalchemy.orm import Session

from ..database import get_db

from ..schemas import (
    UserCreate,
    UserResponse,
    OTPVerify,
    Token
)

from ..repositories.user_repository import (
    get_user_by_email
)

from ..services.user_service import (
    register_user
)

from ..services.auth_service import (
    verify_password,
    create_access_token
)

from ..services.otp_service import (
    send_otp,
    verify_otp
)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# =========================================================
# SEND REGISTRATION OTP
# =========================================================

@router.post("/send-otp")
def send_registration_otp(
    user: UserCreate,
    db: Session = Depends(get_db)
):

    # Normalize email
    email = str(
        user.email
    ).lower().strip()

    # =====================================================
    # CHECK WHETHER USER ALREADY EXISTS
    # =====================================================

    existing_user = get_user_by_email(
        db,
        email
    )

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # =====================================================
    # SEND OTP TO USER'S EMAIL
    # =====================================================

    success = send_otp(
        email
    )

    if not success:

        raise HTTPException(
            status_code=500,
            detail="Failed to send OTP. Please check email configuration."
        )

    return {
        "message": "OTP sent successfully",
        "email": email
    }


# =========================================================
# VERIFY OTP + CREATE ACCOUNT
# =========================================================

@router.post(
    "/verify-otp",
    response_model=UserResponse
)
def verify_registration_otp(
    data: OTPVerify,
    db: Session = Depends(get_db)
):

    email = str(
        data.email
    ).lower().strip()

    # =====================================================
    # CHECK EXISTING USER
    # =====================================================

    existing_user = get_user_by_email(
        db,
        email
    )

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    # =====================================================
    # VERIFY OTP
    # =====================================================

    verified, message = verify_otp(
        email,
        data.otp
    )

    if not verified:

        raise HTTPException(
            status_code=400,
            detail=message
        )

    # =====================================================
    # CREATE USER
    # =====================================================

    new_user = register_user(
        db,
        data.name,
        email,
        data.password,
        data.role
    )

    if not new_user:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    return new_user


# =========================================================
# LOGIN
# =========================================================

@router.post(
    "/login",
    response_model=Token
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    email = (
        form_data.username
        .lower()
        .strip()
    )

    user = get_user_by_email(
        db,
        email
    )

    if not user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        form_data.password,
        user.password
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(
        user.id,
        user.role
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }