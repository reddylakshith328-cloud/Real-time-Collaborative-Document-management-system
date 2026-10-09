from fastapi import (
    APIRouter,
    Depends,
    HTTPException
)

from ..services.security_service import (
    get_current_user
)

from ..services.notification_service import (

    get_user_notifications,

    mark_notification_as_read,

    mark_all_notifications_as_read,

    delete_notification

)


router = APIRouter(

    prefix="/notifications",

    tags=["Notifications"]

)


# ============================================================
# GET NOTIFICATIONS
# ============================================================

@router.get("/")
def get_notifications(

    unread_only: bool = False,

    current_user=Depends(
        get_current_user
    )

):

    return get_user_notifications(

        user_id=
            current_user.id,

        unread_only=
            unread_only

    )


# ============================================================
# MARK ONE AS READ
# ============================================================

@router.put(
    "/{notification_id}/read"
)
def mark_as_read(

    notification_id: str,

    current_user=Depends(
        get_current_user
    )

):

    notification = (

        mark_notification_as_read(

            notification_id=
                notification_id,

            user_id=
                current_user.id

        )

    )


    if not notification:

        raise HTTPException(

            status_code=404,

            detail=
                "Notification not found"

        )


    return {

        "message":
            "Notification marked as read",

        "notification":
            notification

    }


# ============================================================
# MARK ALL AS READ
# ============================================================

@router.put(
    "/read-all"
)
def mark_all_as_read(

    current_user=Depends(
        get_current_user
    )

):

    count = (

        mark_all_notifications_as_read(

            current_user.id

        )

    )


    return {

        "message":
            "All notifications marked as read",

        "updated_count":
            count

    }


# ============================================================
# DELETE NOTIFICATION
# ============================================================

@router.delete(
    "/{notification_id}"
)
def delete_user_notification(

    notification_id: str,

    current_user=Depends(
        get_current_user
    )

):

    deleted = (

        delete_notification(

            notification_id=
                notification_id,

            user_id=
                current_user.id

        )

    )


    if not deleted:

        raise HTTPException(

            status_code=404,

            detail=
                "Notification not found"

        )


    return {

        "message":
            "Notification deleted successfully"

    }