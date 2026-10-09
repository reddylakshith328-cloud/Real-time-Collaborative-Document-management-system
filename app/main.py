from dotenv import load_dotenv

load_dotenv()

import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .kafka.consumer import start_notification_consumer
from .routers import (
    auth,
    users,
    documents,
    folders,
    products,
    collaboration,
    comments,
    notifications,
    search,
)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Real-Time Collaborative Document Management System",
    description=(
        "Enterprise Document Intelligence Platform "
        "with real-time collaboration, version control, "
        "notifications, semantic search and document management."
    ),
    version="4.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(documents.router)
app.include_router(folders.router)
app.include_router(products.router)
app.include_router(collaboration.router)
app.include_router(comments.router)
app.include_router(notifications.router)
app.include_router(search.router)

notification_consumer_thread = None

@app.on_event("startup")
def startup_event():
    global notification_consumer_thread

    print("=================================================")
    print("Real-Time Collaborative Document Management System")
    print("=================================================")
    print("Database initialized.")

    if (
        notification_consumer_thread is None
        or not notification_consumer_thread.is_alive()
    ):
        notification_consumer_thread = threading.Thread(
            target=start_notification_consumer,
            name="kafka-notification-consumer",
            daemon=True,
        )
        notification_consumer_thread.start()
        print("Kafka notification consumer started.")

    print("API server started successfully.")
    print("=================================================")

@app.get("/")
def root():
    return {
        "message": "Enterprise Document Intelligence Platform is running",
        "status": "online",
        "version": "4.0.0",
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Real-Time Collaborative Document Management System",
    }