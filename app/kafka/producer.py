import json
import os
from datetime import datetime, timezone

from confluent_kafka import Producer


KAFKA_BOOTSTRAP_SERVERS = os.getenv(
    "KAFKA_BOOTSTRAP_SERVERS",
    "localhost:9092"
)

KAFKA_NOTIFICATION_TOPIC = os.getenv(
    "KAFKA_NOTIFICATION_TOPIC",
    "document-notifications"
)


producer_config = {
    "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
    "client.id": "enterprise-dms-notification-producer"
}


producer = Producer(producer_config)


def delivery_report(err, message):

    if err is not None:

        print(
            "Kafka notification delivery failed:",
            err
        )

    else:

        print(
            "Kafka notification delivered:",
            message.topic(),
            "partition:",
            message.partition(),
            "offset:",
            message.offset()
        )


def publish_notification(
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "general",
    document_id: int | None = None
):

    notification = {

        "user_id": user_id,

        "title": title,

        "message": message,

        "type": notification_type,

        "document_id": document_id,

        "is_read": False,

        "created_at":
            datetime.now(
                timezone.utc
            ).isoformat()
    }


    notification_json = json.dumps(
        notification
    )


    try:

        producer.produce(

            topic=KAFKA_NOTIFICATION_TOPIC,

            key=str(user_id),

            value=notification_json,

            callback=delivery_report
        )


        # Process delivery callbacks
        producer.poll(0)


        # Wait for Kafka acknowledgement
        producer.flush(5)


        return {

            "status": "published",

            "topic":
                KAFKA_NOTIFICATION_TOPIC,

            "notification":
                notification
        }


    except Exception as error:

        print(
            "Failed to publish Kafka notification:",
            error
        )

        raise