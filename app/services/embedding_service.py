import os

from dotenv import load_dotenv

from sentence_transformers import SentenceTransformer


load_dotenv()


EMBEDDING_MODEL_NAME = os.getenv(
    "EMBEDDING_MODEL",
    "all-MiniLM-L6-v2"
)


embedding_model = SentenceTransformer(
    EMBEDDING_MODEL_NAME
)


def generate_embedding(
    text: str
):

    if not text or not text.strip():

        return None

    embedding = embedding_model.encode(
        text,
        normalize_embeddings=True
    )

    return embedding.tolist()