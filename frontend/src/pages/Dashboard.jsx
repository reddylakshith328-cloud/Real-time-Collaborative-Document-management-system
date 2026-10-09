
import { useEffect, useMemo, useRef, useState } from "react";

import {
  FileText,
  Folder,
  Bell,
  Search,
  LogOut,
  Plus,
  Users,
  X,
  ArrowUpRight,
  Clock3,
  FilePlus2,
  Upload,
  Download,
  Trash2,
  RefreshCw,
} from "lucide-react";

import API from "../services/api";

import DocumentEditor from "./DocumentEditor";
import Folders from "./Folders";
import Collaborators from "./Collaborators";
import Notifications from "./Notifications";

function Dashboard({ onLogout }) {
  const [documents, setDocuments] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showFolders, setShowFolders] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileType, setFileType] = useState("DOC");
  const [selectedFolderId, setSelectedFolderId] = useState("");

  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyDocumentId, setBusyDocumentId] = useState(null);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const fileInputRef = useRef(null);
  const token = localStorage.getItem("access_token");

  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // LOAD DOCUMENTS
  const loadDocuments = async () => {
    try {
      const response = await API.get("/documents/", authConfig);
      setDocuments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load documents:", err);
      setMessage(
        err.response?.data?.detail || "Failed to load documents."
      );
    } finally {
      setLoading(false);
    }
  };

  // LOAD FOLDERS
  const loadFolders = async () => {
    try {
      const response = await API.get("/folders/", authConfig);
      setFolders(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load folders:", err);
    }
  };

  // INITIAL LOAD
  useEffect(() => {
    loadDocuments();
    loadFolders();
    // Load once when the dashboard mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // CREATE A NEW COLLABORATIVE DOCUMENT
  const createDocument = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setCreating(true);
    setError("");

    try {
      await API.post(
        "/documents/",
        {
          title: title.trim(),
          description: description.trim(),
          file_type: fileType,
          folder_id: selectedFolderId
            ? Number(selectedFolderId)
            : null,
          content: "",
        },
        authConfig
      );

      setTitle("");
      setDescription("");
      setFileType("DOC");
      setSelectedFolderId("");
      setShowCreate(false);
      setMessage("Document created successfully.");

      await loadDocuments();
    } catch (err) {
      console.error("Failed to create document:", err);
      setError(
        err.response?.data?.detail || "Failed to create document."
      );
    } finally {
      setCreating(false);
    }
  };

  // UPLOAD A REAL FILE
  const handleUpload = async (event) => {
    const file = event.target.files?.[0];

    // Allow the same file to be selected again later.
    event.target.value = "";

    if (!file) return;

    const allowedExtensions = ["pdf", "doc", "docx", "txt", "rtf"];
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setMessage("Unsupported file. Use PDF, DOC, DOCX, TXT, or RTF.");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setMessage("File is too large. Maximum size is 20 MB.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    setMessage(`Uploading ${file.name}...`);

    try {
      await API.post("/documents/upload", formData, authConfig);

      setMessage(`${file.name} uploaded successfully.`);
      await loadDocuments();
    } catch (err) {
      console.error("Upload failed:", err);
      setMessage(
        err.response?.data?.detail || "File upload failed."
      );
    } finally {
      setUploading(false);
    }
  };

  // DOWNLOAD AN UPLOADED FILE
  const handleDownload = async (event, doc) => {
    event.stopPropagation();

    setBusyDocumentId(doc.id);
    setMessage("");

    try {
      const response = await API.get(
        `/documents/files/${doc.id}`,
        {
          ...authConfig,
          responseType: "blob",
        }
      );

      const blobUrl = window.URL.createObjectURL(
        new Blob([response.data])
      );

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = doc.original_filename || doc.title || `document-${doc.id}`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(blobUrl);
      setMessage("Download started.");
    } catch (err) {
      console.error("Download failed:", err);
      setMessage(
        err.response?.data?.detail ||
          "Download failed. This document may not be an uploaded file."
      );
    } finally {
      setBusyDocumentId(null);
    }
  };

  // DELETE A DOCUMENT
  const handleDelete = async (event, doc) => {
    event.stopPropagation();

    const confirmed = window.confirm(
      `Delete "${doc.title}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setBusyDocumentId(doc.id);
    setMessage("");

    try {
      await API.delete(`/documents/${doc.id}`, authConfig);

      setDocuments((current) =>
        current.filter((item) => item.id !== doc.id)
      );

      setMessage(`"${doc.title}" deleted successfully.`);
    } catch (err) {
      console.error("Delete failed:", err);
      setMessage(
        err.response?.data?.detail ||
          "Delete failed. You may not have permission."
      );
    } finally {
      setBusyDocumentId(null);
    }
  };

  // SEARCH
  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return documents;

    return documents.filter((doc) =>
      `${doc.title || ""} ${doc.description || ""} ${
        doc.file_type || ""
      } ${doc.original_filename || ""}`
        .toLowerCase()
        .includes(query)
    );
  }, [documents, search]);

  // PAGE NAVIGATION
  if (selectedDocument) {
    return (
      <DocumentEditor
        document={selectedDocument}
        onBack={() => {
          setSelectedDocument(null);
          loadDocuments();
        }}
      />
    );
  }

  if (showFolders) {
    return (
      <Folders
        onBack={() => {
          setShowFolders(false);
          loadDocuments();
          loadFolders();
        }}
        onOpenDocument={(doc) => setSelectedDocument(doc)}
      />
    );
  }

  if (showCollaborators) {
    return (
      <Collaborators
        onBack={() => {
          setShowCollaborators(false);
          loadDocuments();
          loadFolders();
        }}
      />
    );
  }

  if (showNotifications) {
    return (
      <Notifications
        onBack={() => {
          setShowNotifications(false);
          loadDocuments();
          loadFolders();
        }}
        onLogout={onLogout}
      />
    );
  }

  return (
    <div className="dashboard">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <FileText size={21} />
          </div>

          <div>
            <span className="brand-name">DocuSphere</span>
            <span className="brand-subtitle">
              DOCUMENT INTELLIGENCE
            </span>
          </div>
        </div>

        <div className="sidebar-divider" />

        <nav className="dashboard-nav">
          <button
            className="nav-item active"
            onClick={() => {
              setShowFolders(false);
              setShowCollaborators(false);
              setShowNotifications(false);
            }}
          >
            <FileText size={18} />
            <span>Documents</span>
          </button>

          <button
            className="nav-item"
            onClick={() => {
              setShowCollaborators(false);
              setShowNotifications(false);
              setShowFolders(true);
            }}
          >
            <Folder size={18} />
            <span>Folders</span>
          </button>

          <button
            className="nav-item"
            onClick={() => {
              setShowFolders(false);
              setShowNotifications(false);
              setShowCollaborators(true);
            }}
          >
            <Users size={18} />
            <span>Collaborators</span>
          </button>

          <button
            className="nav-item"
            onClick={() => {
              setShowFolders(false);
              setShowCollaborators(false);
              setShowNotifications(true);
            }}
          >
            <Bell size={18} />
            <span>Notifications</span>
            <span className="nav-badge">0</span>
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot" />
            <div>
              <strong>System Online</strong>
              <span>All services operational</span>
            </div>
          </div>

          <button className="logout" onClick={onLogout}>
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">
        <header className="dashboard-topbar">
          <div className="page-heading">
            <div className="eyebrow">WORKSPACE</div>
            <h1>Documents</h1>
            <p>Manage and collaborate on your documents.</p>
          </div>

          <div className="top-actions">
            <div className="dashboard-search">
              <Search size={17} />

              <input
                type="text"
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />

              {search && (
                <button
                  className="clear-search"
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              className="notification-button"
              aria-label="Notifications"
              onClick={() => setShowNotifications(true)}
            >
              <Bell size={18} />
            </button>
          </div>
        </header>

        <section className="dashboard-content">
          {/* STATUS MESSAGE */}
          {message && (
            <div
              role="status"
              style={{
                marginBottom: 16,
                padding: "10px 14px",
                borderRadius: 8,
                background: "var(--surface, #f3f4f6)",
                overflowWrap: "anywhere",
              }}
            >
              {message}
              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setMessage("")}
                style={{
                  float: "right",
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                <X size={15} />
              </button>
            </div>
          )}

          {/* STATS */}
          <div className="dashboard-stats">
            <div className="stat-card">
              <div className="stat-icon blue">
                <FileText size={19} />
              </div>
              <div className="stat-info">
                <span>TOTAL DOCUMENTS</span>
                <strong>{documents.length}</strong>
              </div>
              <ArrowUpRight className="stat-arrow" size={17} />
            </div>

            <div className="stat-card">
              <div className="stat-icon purple">
                <Users size={19} />
              </div>
              <div className="stat-info">
                <span>COLLABORATION</span>
                <strong>Active</strong>
              </div>
              <ArrowUpRight className="stat-arrow" size={17} />
            </div>

            <div className="stat-card">
              <div className="stat-icon green">
                <Clock3 size={19} />
              </div>
              <div className="stat-info">
                <span>REAL-TIME STATUS</span>
                <strong>Live</strong>
              </div>
              <span className="live-mini">●</span>
            </div>
          </div>

          {/* DOCUMENT HEADER */}
          <div className="documents-header">
            <div>
              <h2>Your Documents</h2>
              <p>
                {search
                  ? `${filteredDocuments.length} result${
                      filteredDocuments.length !== 1 ? "s" : ""
                    } found`
                  : `${documents.length} document${
                      documents.length !== 1 ? "s" : ""
                    } in your workspace`}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.rtf"
                hidden
                onChange={handleUpload}
              />

              <button
                className="create-button"
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <RefreshCw size={17} />
                ) : (
                  <Upload size={17} />
                )}
                {uploading ? "Uploading..." : "Upload File"}
              </button>

              <button
                className="create-button"
                type="button"
                onClick={() => {
                  setError("");
                  setShowCreate(true);
                }}
              >
                <Plus size={17} />
                New Document
              </button>
            </div>
          </div>

          {/* LOADING / EMPTY / DOCUMENT GRID */}
          {loading ? (
            <div className="dashboard-loading">
              <div className="loading-spinner" />
              <span>Loading workspace...</span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="dashboard-empty">
              <div className="empty-icon">
                <FilePlus2 size={28} />
              </div>

              <h3>
                {search ? "No documents found" : "No documents yet"}
              </h3>

              <p>
                {search
                  ? "Try a different search term."
                  : "Create a document or upload a file to get started."}
              </p>

              {!search && (
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    className="create-button"
                    type="button"
                    onClick={() => setFileInputRef && fileInputRef.current?.click()}
                  >
                    <Upload size={17} />
                    Upload File
                  </button>

                  <button
                    className="create-button"
                    type="button"
                    onClick={() => {
                      setError("");
                      setShowCreate(true);
                    }}
                  >
                    <Plus size={17} />
                    Create Document
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="document-grid">
              {filteredDocuments.map((doc) => {
                const isUploaded =
                  Boolean(doc.original_filename) ||
                  Boolean(doc.file_path) ||
                  Boolean(doc.is_uploaded);

                const isBusy = busyDocumentId === doc.id;

                return (
                  <div className="document-card" key={doc.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedDocument(doc)}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: 0,
                        border: 0,
                        background: "transparent",
                        color: "inherit",
                        textAlign: "left",
                        cursor: "pointer",
                      }}
                      aria-label={`Open ${doc.title}`}
                    >
                      <div className="document-card-top">
                        <div className="document-icon">
                          <FileText size={21} />
                        </div>

                        <span className="document-type">
                          {doc.file_type || "DOC"}
                        </span>
                      </div>

                      <div className="document-card-body">
                        <h3>{doc.title || "Untitled document"}</h3>
                        <p>
                          {doc.description ||
                            doc.original_filename ||
                            "No description provided."}
                        </p>
                      </div>

                      <div className="document-card-footer">
                        <span>Document #{doc.id}</span>
                        <ArrowUpRight
                          size={16}
                          className="document-arrow"
                        />
                      </div>
                    </button>

                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        padding: "10px 14px",
                        borderTop: "1px solid var(--border, #e5e7eb)",
                      }}
                    >
                      {isUploaded && (
                        <button
                          type="button"
                          title="Download file"
                          disabled={isBusy}
                          onClick={(e) => handleDownload(e, doc)}
                          style={actionButtonStyle}
                        >
                          <Download size={15} />
                          Download
                        </button>
                      )}

                      <button
                        type="button"
                        title="Delete document"
                        disabled={isBusy}
                        onClick={(e) => handleDelete(e, doc)}
                        style={actionButtonStyle}
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* CREATE DOCUMENT MODAL */}
      {showCreate && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !creating) {
              setShowCreate(false);
            }
          }}
        >
          <div className="modal dashboard-modal">
            <div className="modal-header">
              <div>
                <div className="modal-eyebrow">WORKSPACE</div>
                <h2>Create Document</h2>
              </div>

              <button
                className="close-button"
                type="button"
                disabled={creating}
                onClick={() => setShowCreate(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={createDocument}>
              <label htmlFor="document-title">Title</label>
              <input
                id="document-title"
                className="modal-input"
                placeholder="Enter document title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                required
              />

              <label htmlFor="document-description">Description</label>
              <textarea
                id="document-description"
                className="modal-input textarea"
                placeholder="Describe your document..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <label htmlFor="document-file-type">File Type</label>
              <select
                id="document-file-type"
                className="modal-input"
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
              >
                <option value="DOC">DOC</option>
                <option value="PDF">PDF</option>
                <option value="TXT">TXT</option>
              </select>

              <label htmlFor="document-folder">Folder</label>
              <select
                id="document-folder"
                className="modal-input"
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
              >
                <option value="">No Folder</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>

              {error && <p className="error">{error}</p>}

              <button
                className="create-button modal-submit"
                type="submit"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <div className="button-spinner" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={17} />
                    Create Document
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const actionButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "7px 10px",
  border: "1px solid var(--border, #d1d5db)",
  borderRadius: 6,
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  fontSize: 12,
};

export default Dashboard;
