from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from sqlalchemy.orm import Session

from ..database import get_db

from ..services.security_service import (
    get_current_user
)

from ..services.search_service import (
    semantic_search
)


router = APIRouter(
    prefix="/search",
    tags=["Semantic Search"]
)


@router.get("/")
def search_documents(
    query: str,
    limit: int = 5,

    current_user=Depends(
        get_current_user
    ),

    db: Session = Depends(
        get_db
    )
):

    if not query.strip():

        raise HTTPException(
            status_code=400,
            detail="Search query cannot be empty"
        )


    if limit < 1 or limit > 50:

        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 50"
        )


    results = semantic_search(

        db=db,

        query=query,

        user_id=current_user.id,

        limit=limit
    )


    return {

        "query":
            query,

        "results":
            results,

        "count":
            len(results)
    }