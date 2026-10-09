from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    ForeignKey,
    Float,
    DateTime,
    UniqueConstraint
)
from sqlalchemy.sql import func

from .database import Base


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(100),
        nullable=False
    )

    email = Column(
        String(150),
        unique=True,
        nullable=False,
        index=True
    )

    password = Column(
        String(255),
        nullable=False
    )

    role = Column(
        String(50),
        default="Viewer"
    )


# ============================================================
# FOLDER
# ============================================================

class Folder(Base):
    __tablename__ = "folders"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    name = Column(
        String(255),
        nullable=False
    )

    owner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )


# ============================================================
# DOCUMENT
# ============================================================

class Document(Base):
    __tablename__ = "documents"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String(255),
        nullable=False
    )

    description = Column(
        Text
    )

    file_type = Column(
        String(50)
    )

    owner_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    folder_id = Column(
        Integer,
        ForeignKey("folders.id"),
        nullable=True
    )

    status = Column(
        String(50),
        default="Pending"
    )


# ============================================================
# PRODUCT
# ============================================================

class Product(Base):
    __tablename__ = "products"

    pid = Column(
        Integer,
        primary_key=True,
        index=True
    )

    pname = Column(
        String(100),
        nullable=False
    )

    price = Column(
        Float,
        nullable=False
    )

    warranty = Column(
        Integer,
        nullable=False
    )


# ============================================================
# DOCUMENT COLLABORATORS
# ============================================================

class DocumentCollaborator(Base):
    __tablename__ = "document_collaborators"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    document_id = Column(
        Integer,
        ForeignKey(
            "documents.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    permission = Column(
        String(20),
        nullable=False,
        default="viewer"
    )

    joined_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    __table_args__ = (
        UniqueConstraint(
            "document_id",
            "user_id",
            name="unique_document_collaborator"
        ),
    )


# ============================================================
# COMMENTS
# ============================================================

class Comment(Base):
    __tablename__ = "comments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    document_id = Column(
        Integer,
        ForeignKey(
            "documents.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey(
            "users.id",
            ondelete="CASCADE"
        ),
        nullable=False
    )

    content = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )