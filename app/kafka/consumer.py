import json
import os

from datetime import datetime

from confluent_kafka import Consumer

from ..mongodb import notifications_collection


KAFKA_BOOTSTRAP_SERVERS = os.getenv(
    "KAFKA_BOOTSTRAP_SERVERS",
    "localhost:9092"
)

KAFKA_NOTIFICATION_TOPIC = os.getenv(
    "KAFKA_NOTIFICATION_TOPIC",
    "document-notifications"
)

KAFKA_CONSUMER_GROUP = os.getenv(
    "KAFKA_CONSUMER_GROUP",
    "notification-service"
)


consumer_config = {

    "bootstrap.servers":
        KAFKA_BOOTSTRAP_SERVERS,

    "group.id":
        KAFKA_CONSUMER_GROUP,

    "auto.offset.reset":
        "earliest",

    "enable.auto.commit":
        False
}


consumer = Consumer(
    consumer_config
)


def start_notification_consumer():

    print(
        "========================================"
    )

    print(
        "Starting Kafka notification consumer..."
    )

    print(
        "Kafka server:",
        KAFKA_BOOTSTRAP_SERVERS
    )

    print(
        "Kafka topic:",
        KAFKA_NOTIFICATION_TOPIC
    )

    print(
        "Kafka consumer group:",
        KAFKA_CONSUMER_GROUP
    )

    print(
        "========================================"
    )


    consumer.subscribe([
        KAFKA_NOTIFICATION_TOPIC
    ])


    try:

        while True:

            message = consumer.poll(
                1.0
            )


            if message is None:

                continue


            if message.error():

                print(
                    "Kafka consumer error:",
                    message.error()
                )

                continue


            try:

                notification = json.loads(
                    message
                    .value()
                    .decode("utf-8")
                )


                # Convert ISO timestamp
                # into MongoDB datetime

                created_at = (
                    notification.get(
                        "created_at"
                    )
                )


                if created_at:

                    notification[
                        "created_at"
                    ] = datetime.fromisoformat(
                        created_at
                    )


                # Store notification in MongoDB

                result = (
                    notifications_collection
                    .insert_one(
                        notification
                    )
                )


                print(
                    "Notification stored in MongoDB:",
                    result.inserted_id
                )


                # Commit Kafka message
                # ONLY after MongoDB succeeds

                consumer.commit(
                    message=message,
                    asynchronous=False
                )


                print(
                    "Kafka message committed."
                )


            except Exception as error:

                print(
                    "Failed to process Kafka notification:",
                    error
                )

                # Do not commit failed messages.
                # Kafka can deliver them again.


    except KeyboardInterrupt:

        print(
            "Kafka notification consumer stopped."
        )


    finally:

        consumer.close()

        print(
            "Kafka consumer closed."
        )