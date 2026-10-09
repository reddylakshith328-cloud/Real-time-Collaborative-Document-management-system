from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# =========================================================
# USER
# =========================================================

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str = "Viewer"


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str

    class Config:
        from_attributes = True


# =========================================================
# OTP
# =========================================================

class OTPVerify(BaseModel):
    name: str
    email: EmailStr
    password: str
    otp: str = Field(
        ...,
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$"
    )
    role: str = "Viewer"


# =========================================================
# LOGIN TOKEN
# =========================================================

class Token(BaseModel):
    access_token: str
    token_type: str


# =========================================================
# FOLDERS
# =========================================================

class FolderCreate(BaseModel):
    name: str


class FolderResponse(BaseModel):
    id: int
    name: str
    owner_id: int

    class Config:
        from_attributes = True


# =========================================================
# DOCUMENTS
# =========================================================

class DocumentCreate(BaseModel):
    title: str
    description: Optional[str] = None
    file_type: Optional[str] = None
    folder_id: Optional[int] = None
    content: Optional[str] = None


class DocumentResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    file_type: Optional[str]
    owner_id: int
    folder_id: Optional[int]
    status: str

    class Config:
        from_attributes = True


class DocumentStatusUpdate(BaseModel):
    status: str


# =========================================================
# COLLABORATORS
# =========================================================

class CollaboratorCreate(BaseModel):
    user_id: int
    permission: str = Field(
        default="viewer",
        pattern="^(viewer|editor)$"
    )


class CollaboratorUpdate(BaseModel):
    permission: str = Field(
        ...,
        pattern="^(viewer|editor)$"
    )


# =========================================================
# COMMENTS
# =========================================================

class CommentCreate(BaseModel):
    content: str = Field(
        ...,
        min_length=1,
        max_length=2000
    )


# =========================================================
# PRODUCTS
# =========================================================

class ProductCreate(BaseModel):
    pname: str = Field(
        ...,
        min_length=1,
        max_length=100
    )

    price: float = Field(
        ...,
        gt=0
    )

    warranty: int = Field(
        ...,
        ge=0
    )


class ProductUpdate(BaseModel):
    pname: str = Field(
        ...,
        min_length=1,
        max_length=100
    )

    price: float = Field(
        ...,
        gt=0
    )

    warranty: int = Field(
        ...,
        ge=0
    )