import { useEffect, useMemo, useState } from "react";

import {
  Folder,
  Plus,
  Search,
  X,
  ArrowUpRight,
  FileText,
  ChevronRight,
  Trash2,
} from "lucide-react";

import API from "../services/api";

function Folders({ onBack, onOpenDocument }) {
  const [folders, setFolders] = useState([]);
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState(null);

  const token = localStorage.getItem("access_token");

  const loadData = async () => {
    try {
      const [foldersResponse, documentsResponse] =
        await Promise.all([
          API.get("/folders/", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),

          API.get("/documents/", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

      setFolders(foldersResponse.data);
      setDocuments(documentsResponse.data);
    } catch (err) {
      console.error("Failed to load folders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const createFolder = async (e) => {
    e.preventDefault();

    if (!folderName.trim()) {
      setError("Folder name is required");
      return;
    }

    setCreating(true);
    setError("");

    try {
      await API.post(
        "/folders/",
        {
          name: folderName.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setFolderName("");
      setShowCreate(false);

      await loadData();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Failed to create folder"
      );
    } finally {
      setCreating(false);
    }
  };

  const deleteFolder = async (folder) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${folder.name}"?\n\nDocuments inside this folder will not be deleted. They will simply become unassigned.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await API.delete(`/folders/${folder.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (
        selectedFolder &&
        selectedFolder.id === folder.id
      ) {
        setSelectedFolder(null);
      }

      await loadData();
    } catch (err) {
      alert(
        err.response?.data?.detail ||
          "Failed to delete folder"
      );
    }
  };

  const getFolderDocumentCount = (folderId) => {
    return documents.filter(
      (doc) => doc.folder_id === folderId
    ).length;
  };

  const filteredFolders = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return folders;
    }

    return folders.filter((folder) =>
      folder.name.toLowerCase().includes(query)
    );
  }, [folders, search]);

  const selectedFolderDocuments = selectedFolder
    ? documents.filter(
        (doc) => doc.folder_id === selectedFolder.id
      )
    : [];

  if (selectedFolder) {
    return (
      <div className="folders-page">
        <div className="folders-topbar">
          <button
            className="back-button"
            onClick={() => setSelectedFolder(null)}
          >
            ← Back to Folders
          </button>
        </div>

        <div className="folder-detail-header">
          <div className="folder-detail-icon">
            <Folder size={30} />
          </div>

          <div>
            <div className="eyebrow">
              FOLDER
            </div>

            <h1>{selectedFolder.name}</h1>

            <p>
              {selectedFolderDocuments.length} document
              {selectedFolderDocuments.length !== 1
                ? "s"
                : ""}{" "}
              in this folder
            </p>
          </div>

          <button
            className="delete-folder-button"
            onClick={() =>
              deleteFolder(selectedFolder)
            }
            title="Delete folder"
          >
            <Trash2 size={17} />
            Delete Folder
          </button>
        </div>

        {selectedFolderDocuments.length === 0 ? (
          <div className="folder-empty">
            <div className="empty-icon">
              <FileText size={28} />
            </div>

            <h3>No documents in this folder</h3>

            <p>
              Documents assigned to this folder will
              appear here.
            </p>
          </div>
        ) : (
          <div className="document-grid">
            {selectedFolderDocuments.map((doc) => (
              <div
                className="document-card"
                key={doc.id}
                onClick={() => onOpenDocument(doc)}
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
                  <h3>{doc.title}</h3>

                  <p>
                    {doc.description ||
                      "No description provided."}
                  </p>
                </div>

                <div className="document-card-footer">
                  <span>
                    Document #{doc.id}
                  </span>

                  <ArrowUpRight
                    size={16}
                    className="document-arrow"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="folders-page">
      <header className="folders-topbar">
        <div>
          <button
            className="back-button"
            onClick={onBack}
          >
            ← Documents
          </button>

          <div className="page-heading folder-heading">
            <div className="eyebrow">
              WORKSPACE
            </div>

            <h1>Folders</h1>

            <p>
              Organize your collaborative documents.
            </p>
          </div>
        </div>

        <div className="folders-actions">
          <div className="dashboard-search">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search folders..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            {search && (
              <button
                className="clear-search"
                onClick={() => setSearch("")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            className="create-button"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={17} />
            New Folder
          </button>
        </div>
      </header>

      <main className="folders-content">
        <div className="folders-section-header">
          <div>
            <h2>Your Folders</h2>

            <p>
              {folders.length} folder
              {folders.length !== 1 ? "s" : ""} in your
              workspace
            </p>
          </div>
        </div>

        {loading ? (
          <div className="dashboard-loading">
            <div className="loading-spinner" />

            <span>
              Loading folders...
            </span>
          </div>
        ) : filteredFolders.length === 0 ? (
          <div className="dashboard-empty">
            <div className="empty-icon">
              <Folder size={28} />
            </div>

            <h3>
              {search
                ? "No folders found"
                : "No folders yet"}
            </h3>

            <p>
              {search
                ? "Try a different search term."
                : "Create your first folder to organize your documents."}
            </p>

            {!search && (
              <button
                className="create-button"
                onClick={() =>
                  setShowCreate(true)
                }
              >
                <Plus size={17} />
                Create Folder
              </button>
            )}
          </div>
        ) : (
          <div className="folder-grid">
            {filteredFolders.map((folder) => {
              const count =
                getFolderDocumentCount(folder.id);

              return (
                <div
                  className="folder-card"
                  key={folder.id}
                  onClick={() =>
                    setSelectedFolder(folder)
                  }
                >
                  <div className="folder-card-top">
                    <div className="folder-icon">
                      <Folder size={25} />
                    </div>

                    <div className="folder-card-actions">
                      <button
                        className="folder-delete-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteFolder(folder);
                        }}
                        title="Delete folder"
                      >
                        <Trash2 size={16} />
                      </button>

                      <ArrowUpRight
                        size={18}
                        className="folder-arrow"
                      />
                    </div>
                  </div>

                  <div className="folder-card-body">
                    <h3>{folder.name}</h3>

                    <p>
                      {count} document
                      {count !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="folder-card-footer">
                    <span>
                      Folder #{folder.id}
                    </span>

                    <ChevronRight size={16} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showCreate && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowCreate(false);
            }
          }}
        >
          <div className="modal dashboard-modal">
            <div className="modal-header">
              <div>
                <div className="modal-eyebrow">
                  WORKSPACE
                </div>

                <h2>Create Folder</h2>
              </div>

              <button
                className="close-button"
                onClick={() =>
                  setShowCreate(false)
                }
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={createFolder}>
              <label>Folder Name</label>

              <input
                className="modal-input"
                placeholder="Enter folder name"
                value={folderName}
                onChange={(e) =>
                  setFolderName(e.target.value)
                }
                autoFocus
              />

              {error && (
                <p className="error">
                  {error}
                </p>
              )}

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
                    Create Folder
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

export default Folders;