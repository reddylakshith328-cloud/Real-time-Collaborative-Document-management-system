import os

from dotenv import load_dotenv

from sqlalchemy import (
    create_engine,
    text
)

from sqlalchemy.orm import (
    declarative_base,
    sessionmaker
)


load_dotenv()


DATABASE_URL = os.getenv(
    "DATABASE_URL"
)


engine = create_engine(
    DATABASE_URL
)


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


Base = declarative_base()


def get_db():

    db = SessionLocal()

    try:

        yield db

    finally:

        db.close()


# ============================================================
# PGVECTOR SETUP
# ============================================================

with engine.begin() as connection:

    connection.execute(
        text(
            "CREATE EXTENSION IF NOT EXISTS vector"
        )
    )