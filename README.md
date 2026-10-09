# Real-Time Collaborative Document Management System

A centralized, secure platform for organizations to store, organize, search, and collaboratively edit documents in real time — built to replace scattered file storage, manual approval workflows, and email-based collaboration with a single, auditable system.

## 📌 Project Info

- **Course:** 25CS1302E – Database Systems Engineering & Distributed Backend Development (DBS-DBD)
- **Supervisor:** Dr. Sasidhar Kothuru
- **Team:**
  - Lakshith – 2510030332
  - Ranadeep – 2510030337
  - Jivith – 2510030430
  - Rahul – 2510030322

## 📖 Description

Documents in most organizations are scattered across drives and tools, routed through slow manual approvals, and hard to search — leading to duplicate files and unauthorized access risks. This project provides a unified document management platform with:

- Centralized upload, folder organization, and metadata tagging
- Role-based access control (Admin / Editor / Commenter / Viewer)
- Real-time collaborative editing with automatic conflict resolution (CRDT-based, no lost edits)
- Full version history with diff-based snapshots and rollback
- Full-text document search
- Complete audit trail of every document action

## 🛠️ Technologies Used

**Frontend**
- React.js

**Backend**
- Spring Boot (Java)
- Spring Security + JWT (stateless authentication)

**Database & Storage**
- PostgreSQL (relational data: users, metadata, permissions, versions)
- Redis (session/token cache, search-query cache)
- S3-compatible object storage / MinIO (document file storage)

**Real-Time Collaboration**
- WebSocket (STOMP) + Yjs (CRDT) for conflict-free concurrent editing

**Other Tools**
- Postman (API testing)
- IntelliJ IDEA / VS Code
- Git & GitHub (source code version control)

## ⚙️ Installation / Setup

### Prerequisites
- Java 17+ and Maven
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis
- Git

### Clone the repository
```bash
git clone https://github.com/reddylakshith328-cloud/Real-time-Collaborative-Document-management-system.git
cd Real-time-Collaborative-Document-management-system
```

### Backend setup
```bash
cd source-code/backend
# configure application.properties / application.yml with your PostgreSQL & Redis credentials
mvn clean install
```

### Frontend setup
```bash
cd source-code/frontend
npm install
```

### Database setup
```bash
# create the database
createdb docmanagement
# run migrations / schema script
psql -d docmanagement -f dataset/schema.sql
```

## ▶️ How to Run the Project

**Start the backend**
```bash
cd source-code/backend
mvn spring-boot:run
```
Backend runs at `http://localhost:8080`

**Start the frontend**
```bash
cd source-code/frontend
npm start
```
Frontend runs at `http://localhost:3000`

## 📸 Screenshots / Results

> Add screenshots once available — save images in `/screenshots` and embed here:

| Login / Auth | Dashboard | Real-Time Collaboration |
|---|---|---|
| ![login](screenshots/login.png) | ![dashboard](screenshots/dashboard.png) | ![collab](screenshots/collab-edit.png) |

Detailed results, test data, and performance notes are documented in `/results` and `/documentation`.

## 📂 Repository Structure
