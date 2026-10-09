import { useEffect, useMemo, useState } from "react";

import {
  Users,
  Search,
  UserPlus,
  X,
  Trash2,
  Shield,
  Eye,
  Edit3,
} from "lucide-react";

import API from "../services/api";

function Collaborators({ onBack }) {
  const [documents, setDocuments] = useState([]);
  const [selectedDocumentId, setSelectedDocumentId] =
    useState("");

  const [collaborators, setCollaborators] = useState([]);
  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState("");

  const [selectedUserId, setSelectedUserId] =
    useState("");

  const [permission, setPermission] =
    useState("viewer");

  const [loading, setLoading] = useState(true);
  const [loadingCollaborators, setLoadingCollaborators] =
    useState(false);

  const [adding, setAdding] = useState(false);

  const token =
    localStorage.getItem("access_token");

  const authConfig = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  // =========================================================
  // LOAD DOCUMENTS + USERS
  // =========================================================

  const loadData = async () => {
    try {
      const [
        documentsResponse,
        usersResponse,
      ] = await Promise.all([
        API.get(
          "/documents/",
          authConfig
        ),

        API.get(
          "/users/",
          authConfig
        ),
      ]);

      setDocuments(
        documentsResponse.data || []
      );

      setUsers(
        usersResponse.data || []
      );
    } catch (error) {
      console.error(
        "Failed to load collaborators data:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =========================================================
  // LOAD COLLABORATORS
  // =========================================================

  const loadCollaborators = async (
    documentId
  ) => {
    if (!documentId) {
      setCollaborators([]);
      return;
    }

    setLoadingCollaborators(true);

    try {
      const response = await API.get(
        `/documents/${documentId}/collaborators`,
        authConfig
      );

      setCollaborators(
        response.data || []
      );
    } catch (error) {
      console.error(
        "Failed to load collaborators:",
        error
      );

      setCollaborators([]);
    } finally {
      setLoadingCollaborators(false);
    }
  };

  // =========================================================
  // DOCUMENT CHANGE
  // =========================================================

  const handleDocumentChange = (e) => {
    const documentId = e.target.value;

    setSelectedDocumentId(
      documentId
    );

    setSelectedUserId("");

    loadCollaborators(
      documentId
    );
  };

  // =========================================================
  // AVAILABLE USERS
  // =========================================================

  const availableUsers = useMemo(() => {
    const collaboratorIds =
      collaborators.map(
        (collaborator) =>
          collaborator.user_id
      );

    const query =
      search.trim().toLowerCase();

    return users.filter((user) => {
      if (
        collaboratorIds.includes(
          user.id
        )
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        user.name
          ?.toLowerCase()
          .includes(query) ||
        user.email
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [
    users,
    collaborators,
    search,
  ]);

  // =========================================================
  // ADD COLLABORATOR
  // =========================================================

  const addCollaborator = async () => {
    if (
      !selectedDocumentId ||
      !selectedUserId
    ) {
      return;
    }

    setAdding(true);

    try {
      await API.post(
        `/documents/${selectedDocumentId}/collaborators`,
        null,
        {
          params: {
            user_id:
              Number(selectedUserId),

            permission:
              permission,
          },

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setSelectedUserId("");

      setSearch("");

      await loadCollaborators(
        selectedDocumentId
      );
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          "Failed to add collaborator"
      );
    } finally {
      setAdding(false);
    }
  };

  // =========================================================
  // UPDATE PERMISSION
  // =========================================================

  const updatePermission = async (
    userId,
    newPermission
  ) => {
    try {
      await API.put(
        `/documents/${selectedDocumentId}/collaborators/${userId}`,
        null,
        {
          params: {
            permission:
              newPermission,
          },

          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      await loadCollaborators(
        selectedDocumentId
      );
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          "Failed to update permission"
      );
    }
  };

  // =========================================================
  // REMOVE COLLABORATOR
  // =========================================================

  const removeCollaborator = async (
    collaborator
  ) => {
    const confirmed =
      window.confirm(
        `Remove ${collaborator.email} from this document?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await API.delete(
        `/documents/${selectedDocumentId}/collaborators/${collaborator.user_id}`,
        authConfig
      );

      await loadCollaborators(
        selectedDocumentId
      );
    } catch (error) {
      alert(
        error.response?.data?.detail ||
          "Failed to remove collaborator"
      );
    }
  };

  // =========================================================
  // DOCUMENT NAME
  // =========================================================

  const selectedDocument =
    documents.find(
      (document) =>
        String(document.id) ===
        String(selectedDocumentId)
    );

  if (loading) {
    return (
      <div className="collaborators-page">
        <div className="dashboard-loading">
          <div className="loading-spinner" />

          <span>
            Loading collaborators...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="collaborators-page">

      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <header className="collaborators-topbar">

        <div>
          <button
            className="back-button"
            onClick={onBack}
          >
            ← Documents
          </button>

          <div className="page-heading">
            <div className="eyebrow">
              WORKSPACE
            </div>

            <h1>
              Collaborators
            </h1>

            <p>
              Manage document access and
              permissions.
            </p>
          </div>
        </div>

      </header>


      {/* =====================================================
          CONTENT
      ===================================================== */}

      <main className="collaborators-content">

        {/* DOCUMENT SELECTOR */}

        <section className="collaborator-panel">

          <div className="panel-header">

            <div>
              <div className="panel-icon">
                <Shield size={20} />
              </div>

              <div>
                <h2>
                  Select Document
                </h2>

                <p>
                  Choose a document to
                  manage its collaborators.
                </p>
              </div>
            </div>

          </div>

          <select
            className="collaborator-document-select"
            value={
              selectedDocumentId
            }
            onChange={
              handleDocumentChange
            }
          >
            <option value="">
              Select a document
            </option>

            {documents.map(
              (document) => (
                <option
                  key={document.id}
                  value={document.id}
                >
                  {document.title}
                </option>
              )
            )}
          </select>

        </section>


        {/* ===================================================
            NO DOCUMENT
        =================================================== */}

        {!selectedDocumentId ? (

          <div className="collaborator-empty">

            <div className="empty-icon">
              <Users size={30} />
            </div>

            <h3>
              Select a document
            </h3>

            <p>
              Choose a document above to
              manage who can access it.
            </p>

          </div>

        ) : (

          <>

            {/* =================================================
                ADD COLLABORATOR
            ================================================= */}

            <section className="collaborator-panel">

              <div className="panel-heading-row">

                <div>
                  <div className="eyebrow">
                    {selectedDocument?.title ||
                      "DOCUMENT"}
                  </div>

                  <h2>
                    Add Collaborator
                  </h2>

                  <p>
                    Give another user access
                    to this document.
                  </p>
                </div>

              </div>


              <div className="collaborator-add-grid">

                {/* USER SEARCH */}

                <div className="collaborator-field">

                  <label>
                    User
                  </label>

                  <div className="collaborator-search">

                    <Search size={17} />

                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={search}
                      onChange={(e) =>
                        setSearch(
                          e.target.value
                        )
                      }
                    />

                    {search && (
                      <button
                        onClick={() =>
                          setSearch("")
                        }
                      >
                        <X size={14} />
                      </button>
                    )}

                  </div>


                  {search && (
                    <div className="user-results">

                      {availableUsers.length ===
                      0 ? (

                        <div className="user-result-empty">
                          No available users
                          found.
                        </div>

                      ) : (

                        availableUsers
                          .slice(0, 8)
                          .map((user) => (
                            <button
                              className={
                                selectedUserId ===
                                String(user.id)
                                  ? "user-result selected"
                                  : "user-result"
                              }
                              key={user.id}
                              onClick={() => {
                                setSelectedUserId(
                                  String(
                                    user.id
                                  )
                                );

                                setSearch(
                                  user.email
                                );
                              }}
                            >

                              <div className="user-avatar">
                                {user.name
                                  ?.charAt(
                                    0
                                  )
                                  ?.toUpperCase() ||
                                  "U"}
                              </div>

                              <div className="user-result-info">

                                <strong>
                                  {user.name}
                                </strong>

                                <span>
                                  {user.email}
                                </span>

                              </div>

                            </button>
                          ))

                      )}

                    </div>
                  )}

                </div>


                {/* PERMISSION */}

                <div className="collaborator-field">

                  <label>
                    Permission
                  </label>

                  <select
                    className="permission-select"
                    value={permission}
                    onChange={(e) =>
                      setPermission(
                        e.target.value
                      )
                    }
                  >
                    <option value="viewer">
                      Viewer
                    </option>

                    <option value="editor">
                      Editor
                    </option>
                  </select>

                </div>


                {/* ADD BUTTON */}

                <button
                  className="create-button collaborator-add-button"
                  onClick={
                    addCollaborator
                  }
                  disabled={
                    adding ||
                    !selectedUserId
                  }
                >
                  <UserPlus size={17} />

                  {adding
                    ? "Adding..."
                    : "Add Collaborator"}
                </button>

              </div>

            </section>


            {/* =================================================
                CURRENT COLLABORATORS
            ================================================= */}

            <section className="collaborator-panel">

              <div className="panel-heading-row">

                <div>
                  <div className="eyebrow">
                    ACCESS
                  </div>

                  <h2>
                    Current Collaborators
                  </h2>

                  <p>
                    {collaborators.length}{" "}
                    collaborator
                    {collaborators.length !==
                    1
                      ? "s"
                      : ""}{" "}
                    have access to this
                    document.
                  </p>
                </div>

                <div className="collaborator-count">
                  <Users size={17} />
                  {collaborators.length}
                </div>

              </div>


              {loadingCollaborators ? (

                <div className="dashboard-loading">
                  <div className="loading-spinner" />

                  <span>
                    Loading collaborators...
                  </span>
                </div>

              ) : collaborators.length ===
                0 ? (

                <div className="collaborator-empty small">

                  <div className="empty-icon">
                    <Users size={25} />
                  </div>

                  <h3>
                    No collaborators yet
                  </h3>

                  <p>
                    Add users above to
                    collaborate on this
                    document.
                  </p>

                </div>

              ) : (

                <div className="collaborator-list">

                  {collaborators.map(
                    (collaborator) => (

                      <div
                        className="collaborator-row"
                        key={
                          collaborator.user_id
                        }
                      >

                        <div className="collaborator-user">

                          <div className="user-avatar large">
                            {collaborator.email
                              ?.charAt(
                                0
                              )
                              ?.toUpperCase() ||
                              "U"}
                          </div>

                          <div>

                            <strong>
                              {collaborator.email}
                            </strong>

                            <span>
                              User #
                              {
                                collaborator.user_id
                              }
                            </span>

                          </div>

                        </div>


                        <div className="collaborator-actions">

                          {/* PERMISSION */}

                          <select
                            className="permission-select compact"
                            value={
                              collaborator.permission
                            }
                            onChange={(e) =>
                              updatePermission(
                                collaborator.user_id,
                                e.target.value
                              )
                            }
                          >

                            <option value="viewer">
                              Viewer
                            </option>

                            <option value="editor">
                              Editor
                            </option>

                          </select>


                          {/* REMOVE */}

                          <button
                            className="remove-collaborator-button"
                            onClick={() =>
                              removeCollaborator(
                                collaborator
                              )
                            }
                            title="Remove access"
                          >
                            <Trash2
                              size={17}
                            />
                          </button>

                        </div>

                      </div>

                    )
                  )}

                </div>

              )}

            </section>

          </>

        )}

      </main>

    </div>
  );
}

export default Collaborators;