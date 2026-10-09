from sqlalchemy import text

from .embedding_service import (
    generate_embedding
)


def semantic_search(
    db,
    query: str,
    user_id: int,
    limit: int = 5
):

    query = query.strip()

    if not query:

        return []


    query_embedding = generate_embedding(
        query
    )


    sql = text(
        """
        SELECT
            d.id,
            d.title,
            d.description,
            d.file_type,
            d.status,
            d.owner_id,
            d.folder_id,

            1 - (
                d.embedding
                <=>
                CAST(
                    :embedding AS vector
                )
            ) AS similarity

        FROM documents d

        LEFT JOIN document_collaborators dc

            ON d.id =
               dc.document_id

            AND dc.user_id =
                :user_id

        WHERE
            d.embedding IS NOT NULL

            AND (
                d.owner_id =
                :user_id

                OR

                dc.user_id =
                :user_id
            )

        ORDER BY
            d.embedding
            <=>
            CAST(
                :embedding AS vector
            )

        LIMIT :limit
        """
    )


    result = db.execute(
        sql,
        {
            "embedding":
                str(query_embedding),

            "user_id":
                user_id,

            "limit":
                limit
        }
    )


    documents = []

    for row in result:

        documents.append({

            "id":
                row.id,

            "title":
                row.title,

            "description":
                row.description,

            "file_type":
                row.file_type,

            "status":
                row.status,

            "owner_id":
                row.owner_id,

            "folder_id":
                row.folder_id,

            "similarity":
                round(
                    float(
                        row.similarity
                    ),
                    4
                )
        })


    return documents