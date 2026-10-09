from pymongo import MongoClient
from dotenv import load_dotenv
import os


# Load environment variables from .env
load_dotenv()


# ============================================================
# MongoDB Configuration
# ============================================================

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "enterprise_dms")


# ============================================================
# MongoDB Connection
# ============================================================

client = MongoClient(MONGODB_URL)

db = client[MONGODB_DATABASE]


# ============================================================
# Collections
# ============================================================

# Current document content
documents_collection = db["documents"]

# Document version history
versions_collection = db["versions"]

# Document activity / audit history
audit_collection = db["audit_logs"]

# Comments and discussions
comments_collection = db["comments"]

# User notifications
notifications_collection = db["notifications"]


# ============================================================
# Indexes
# ============================================================

# Document lookup
documents_collection.create_index("document_id")

# Version history
versions_collection.create_index(
    [
        ("document_id", 1),
        ("version", -1)
    ]
)

# Audit logs
audit_collection.create_index(
    [
        ("document_id", 1),
        ("created_at", -1)
    ]
)

# Comments
comments_collection.create_index(
    [
        ("document_id", 1),
        ("created_at", -1)
    ]
)

# Notifications
notifications_collection.create_index(
    [
        ("user_id", 1),
        ("created_at", -1)
    ]
)


# ============================================================
# MongoDB Connection Test
# ============================================================

try:
    client.admin.command("ping")
    print("MongoDB connected successfully")
    print(f"MongoDB database: {MONGODB_DATABASE}")

except Exception as e:
    print(f"MongoDB connection failed: {e}")