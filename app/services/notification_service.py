from typing import Optional

from bson import ObjectId

from ..kafka.producer import (
    publish_notification
)

from ..mongodb import (
    notifications_collection
)


def create_notification(
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "general",
    document_id: Optional[int] = None
):

    return publish_notification(

        user_id=user_id,

        title=title,

        message=message,

        notification_type=
            notification_type,

        document_id=
            document_id
    )


def get_user_notifications(
    user_id: int,
    unread_only: bool = False,
    limit: int = 100
):

    query = {

        "user_id":
            user_id
    }


    if unread_only:

        query[
            "is_read"
        ] = False


    notifications = (

        notifications_collection

        .find(query)

        .sort(
            "created_at",
            -1
        )

        .limit(limit)
    )


    return [

        serialize_notification(
            notification
        )

        for notification
        in notifications
    ]


def mark_notification_as_read(
    notification_id: str,
    user_id: int
):

    if not ObjectId.is_valid(
        notification_id
    ):

        return None


    object_id = ObjectId(
        notification_id
    )


    notification = (

        notifications_collection

        .find_one({

            "_id":
                object_id,

            "user_id":
                user_id

        })
    )


    if not notification:

        return None


    from datetime import datetime, timezone


    read_time = datetime.now(
        timezone.utc
    )


    notifications_collection.update_one(

        {

            "_id":
                object_id,

            "user_id":
                user_id

        },

        {

            "$set": {

                "is_read":
                    True,

                "read_at":
                    read_time

            }

        }
    )


    notification[
        "is_read"
    ] = True


    notification[
        "read_at"
    ] = read_time


    return serialize_notification(
        notification
    )


def mark_all_notifications_as_read(
    user_id: int
):

    from datetime import datetime, timezone


    result = (

        notifications_collection

        .update_many(

            {

                "user_id":
                    user_id,

                "is_read":
                    False

            },

            {

                "$set": {

                    "is_read":
                        True,

                    "read_at":
                        datetime.now(
                            timezone.utc
                        )

                }

            }

        )

    )


    return result.modified_count


def delete_notification(
    notification_id: str,
    user_id: int
):

    if not ObjectId.is_valid(
        notification_id
    ):

        return False


    result = (

        notifications_collection

        .delete_one({

            "_id":
                ObjectId(
                    notification_id
                ),

            "user_id":
                user_id

        })

    )


    return (
        result.deleted_count > 0
    )


def serialize_notification(
    notification: dict
):

    return {

        "id":
            str(
                notification["_id"]
            ),

        "user_id":
            notification.get(
                "user_id"
            ),

        "title":
            notification.get(
                "title",
                ""
            ),

        "message":
            notification.get(
                "message",
                ""
            ),

        "type":
            notification.get(
                "type",
                "general"
            ),

        "document_id":
            notification.get(
                "document_id"
            ),

        "is_read":
            notification.get(
                "is_read",
                False
            ),

        "created_at":
            notification.get(
                "created_at"
            ),

        "read_at":
            notification.get(
                "read_at"
            )

    }