import { useEffect, useRef, useState } from "react";

import {
  ArrowLeft,
  Users,
  MessageSquare,
  Save,
  Send,
  History,
  X,
  RotateCcw,
  Clock,
  Folder,
} from "lucide-react";

import API from "../services/api";

function DocumentEditor({ document, onBack }) {
  const [content, setContent] = useState("");

  const [onlineUsers, setOnlineUsers] =
    useState([]);

  const [typingUsers, setTypingUsers] =
    useState([]);

  const [comments, setComments] =
    useState([]);

  const [commentText, setCommentText] =
    useState("");

  const [showComments, setShowComments] =
    useState(true);

  const [showHistory, setShowHistory] =
    useState(false);

  const [versions, setVersions] =
    useState([]);

  const [selectedVersion, setSelectedVersion] =
    useState(null);

  const [loadingVersions, setLoadingVersions] =
    useState(false);

  const [restoring, setRestoring] =
    useState(false);

  const [connected, setConnected] =
    useState(false);

  const [folders, setFolders] =
    useState([]);

  const [selectedFolderId, setSelectedFolderId] =
    useState(
      document.folder_id ?? ""
    );

  const [movingFolder, setMovingFolder] =
    useState(false);

  const ws = useRef(null);

  const typingTimer = useRef(null);

  const token =
    localStorage.getItem("access_token");


  // =========================================================
  // LOAD DOCUMENT + FOLDERS + CONNECT WEBSOCKET
  // =========================================================

  useEffect(() => {
    loadDocument();
    loadFolders();
    connectWebSocket();

    return () => {
      if (ws.current) {
        ws.current.close();
      }

      clearTimeout(
        typingTimer.current
      );
    };
  }, []);


  // =========================================================
  // LOAD DOCUMENT
  // =========================================================

  const loadDocument = async () => {
    try {
      const response = await API.get(
        `/documents/${document.id}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setContent(
        response.data.content || ""
      );

      setSelectedFolderId(
        response.data.folder_id ?? ""
      );

    } catch (error) {
      console.error(
        "Failed to load document:",
        error
      );
    }
  };


  // =========================================================
  // LOAD FOLDERS
  // =========================================================

  const loadFolders = async () => {
    try {
      const response = await API.get(
        "/folders/",
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setFolders(
        response.data || []
      );

    } catch (error) {
      console.error(
        "Failed to load folders:",
        error
      );
    }
  };


  // =========================================================
  // MOVE DOCUMENT TO FOLDER
  // =========================================================

  const moveDocumentToFolder = async (
    folderId
  ) => {
    setMovingFolder(true);

    try {
      await API.put(
        `/documents/${document.id}`,
        {
          title:
            document.title,

          description:
            document.description || "",

          file_type:
            document.file_type || "DOC",

          folder_id:
            folderId === ""
              ? null
              : Number(folderId),
        },
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setSelectedFolderId(
        folderId
      );

    } catch (error) {
      console.error(
        "Failed to update document folder:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to update document folder"
      );

      // Restore previous selection
      setSelectedFolderId(
        document.folder_id ?? ""
      );

    } finally {
      setMovingFolder(false);
    }
  };


  // =========================================================
  // LOAD VERSION HISTORY
  // =========================================================

  const loadVersions = async () => {
    setLoadingVersions(true);

    try {
      const response = await API.get(
        `/documents/${document.id}/versions`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setVersions(
        response.data || []
      );

    } catch (error) {
      console.error(
        "Failed to load versions:",
        error
      );

    } finally {
      setLoadingVersions(false);
    }
  };


  // =========================================================
  // OPEN VERSION HISTORY
  // =========================================================

  const toggleHistory = async () => {
    const nextState =
      !showHistory;

    setShowHistory(nextState);

    if (nextState) {
      await loadVersions();
    } else {
      setSelectedVersion(null);
    }
  };


  // =========================================================
  // WEBSOCKET
  // =========================================================

  const connectWebSocket = () => {
    const socket = new WebSocket(
      `ws://127.0.0.1:8000/documents/ws/${document.id}?token=${token}`
    );

    ws.current = socket;

    socket.onopen = () => {
      console.log(
        "WebSocket connected"
      );

      setConnected(true);
    };

    socket.onclose = () => {
      console.log(
        "WebSocket disconnected"
      );

      setConnected(false);
    };

    socket.onerror = (error) => {
      console.error(
        "WebSocket error:",
        error
      );
    };

    socket.onmessage = (event) => {
      const data =
        JSON.parse(event.data);

      console.log(
        "WebSocket message:",
        data
      );


      // =====================================================
      // INITIAL DOCUMENT
      // =====================================================

      if (
        data.type ===
        "initial_document"
      ) {
        setContent(
          data.content || ""
        );

        setOnlineUsers(
          data.online_users || []
        );
      }


      // =====================================================
      // DOCUMENT UPDATE
      // =====================================================

      if (
        data.type ===
        "document_update"
      ) {
        setContent(
          data.content || ""
        );
      }


      // =====================================================
      // PRESENCE
      // =====================================================

      if (
        data.type ===
        "presence"
      ) {
        setOnlineUsers(
          data.online_users || []
        );
      }


      // =====================================================
      // TYPING
      // =====================================================

      if (
        data.type ===
        "typing"
      ) {
        if (data.is_typing) {
          setTypingUsers(
            (current) => {
              if (
                current.includes(
                  data.user_id
                )
              ) {
                return current;
              }

              return [
                ...current,
                data.user_id,
              ];
            }
          );

        } else {
          setTypingUsers(
            (current) =>
              current.filter(
                (id) =>
                  id !==
                  data.user_id
              )
          );
        }
      }


      // =====================================================
      // NEW COMMENT
      // =====================================================

      if (
        data.type ===
        "new_comment"
      ) {
        setComments(
          (current) => [
            ...current,
            {
              id:
                data.comment_id,

              user_id:
                data.user_id,

              content:
                data.content,

              created_at:
                data.created_at,
            },
          ]
        );
      }
    };
  };


  // =========================================================
  // DOCUMENT EDIT
  // =========================================================

  const handleChange = (e) => {
    const value =
      e.target.value;

    setContent(value);

    if (
      ws.current &&
      ws.current.readyState ===
        WebSocket.OPEN
    ) {
      ws.current.send(
        JSON.stringify({
          type: "edit",
          content: value,
        })
      );

      ws.current.send(
        JSON.stringify({
          type: "typing",
          is_typing: true,
        })
      );

      clearTimeout(
        typingTimer.current
      );

      typingTimer.current =
        setTimeout(() => {
          if (
            ws.current &&
            ws.current.readyState ===
              WebSocket.OPEN
          ) {
            ws.current.send(
              JSON.stringify({
                type: "typing",
                is_typing: false,
              })
            );
          }
        }, 1000);
    }
  };


  // =========================================================
  // SEND COMMENT
  // =========================================================

  const sendComment = () => {
    if (
      !commentText.trim()
    ) {
      return;
    }

    if (
      ws.current &&
      ws.current.readyState ===
        WebSocket.OPEN
    ) {
      ws.current.send(
        JSON.stringify({
          type: "comment",
          content:
            commentText.trim(),
        })
      );

      setCommentText("");
    }
  };


  // =========================================================
  // COMMENT ENTER
  // =========================================================

  const handleCommentKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendComment();
    }
  };


  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate = (date) => {
    if (!date) {
      return "Unknown time";
    }

    try {
      return new Date(
        date
      ).toLocaleString(
        undefined,
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );

    } catch {
      return "Unknown time";
    }
  };


  // =========================================================
  // RESTORE VERSION
  // =========================================================

  const restoreVersion = async () => {
    if (!selectedVersion) {
      return;
    }

    const confirmed =
      window.confirm(
        `Restore Version ${selectedVersion.version}?`
      );

    if (!confirmed) {
      return;
    }

    setRestoring(true);

    try {
      await API.put(
        `/documents/${document.id}`,
        {
          title:
            document.title,

          description:
            document.description || "",

          file_type:
            document.file_type || "DOC",

          folder_id:
            selectedFolderId === ""
              ? null
              : Number(
                  selectedFolderId
                ),

          content:
            selectedVersion.content ||
            "",
        },
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      setContent(
        selectedVersion.content || ""
      );

      await loadVersions();

      setSelectedVersion(null);

      alert(
        `Version ${selectedVersion.version} restored successfully.`
      );

    } catch (error) {
      console.error(
        "Failed to restore version:",
        error
      );

      alert(
        error.response?.data?.detail ||
          "Failed to restore version"
      );

    } finally {
      setRestoring(false);
    }
  };


  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="editor-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="editor-header">

        <button
          className="back-button"
          onClick={onBack}
        >
          <ArrowLeft size={18} />

          Back
        </button>


        <div className="editor-title">

          <h2>
            {document.title}
          </h2>

          <span
            className={
              connected
                ? "connection online"
                : "connection"
            }
          >
            {connected
              ? "● Live"
              : "● Offline"}
          </span>


          {/* =================================================
              FOLDER SELECTOR
          ================================================= */}

          <div className="folder-selector">

            <Folder size={16} />

            <select
              value={
                selectedFolderId
              }
              onChange={(e) =>
                moveDocumentToFolder(
                  e.target.value
                )
              }
              disabled={
                movingFolder
              }
            >

              <option value="">
                No Folder
              </option>

              {folders.map(
                (folder) => (
                  <option
                    key={folder.id}
                    value={folder.id}
                  >
                    {folder.name}
                  </option>
                )
              )}

            </select>

          </div>

        </div>


        <div className="editor-actions">

          <div className="online-users">

            <Users size={18} />

            {onlineUsers.length} online

          </div>


          <button
            className="editor-button"
            onClick={() =>
              setShowComments(
                !showComments
              )
            }
          >
            <MessageSquare size={18} />

            Comments
          </button>


          <button
            className={
              showHistory
                ? "editor-button active-button"
                : "editor-button"
            }
            onClick={
              toggleHistory
            }
          >
            <History size={18} />

            History
          </button>


          <button
            className="editor-button"
          >
            <Save size={18} />

            Saved
          </button>

        </div>

      </header>


      {/* =====================================================
          MAIN LAYOUT
      ===================================================== */}

      <div className="editor-layout">

        {/* ===================================================
            DOCUMENT EDITOR
        =================================================== */}

        <main className="editor-main">

          <textarea
            className="document-editor"
            value={content}
            onChange={
              handleChange
            }
            placeholder="Start writing your document..."
          />


          {typingUsers.length > 0 && (
            <div className="typing-indicator">
              Someone is typing...
            </div>
          )}

        </main>


        {/* ===================================================
            COMMENTS SIDEBAR
        =================================================== */}

        {showComments && (
          <aside className="editor-sidebar">

            <h3>
              Collaboration
            </h3>


            {/* ONLINE USERS */}

            <div className="sidebar-section">

              <div className="section-title">

                <Users size={17} />

                Online Users

              </div>


              {onlineUsers.length ===
              0 ? (
                <p className="muted">
                  No other users online
                </p>
              ) : (
                onlineUsers.map(
                  (userId) => (
                    <div
                      className="user-row"
                      key={userId}
                    >
                      <span
                        className="user-dot"
                      />

                      User {userId}
                    </div>
                  )
                )
              )}

            </div>


            {/* COMMENTS */}

            <div className="sidebar-section">

              <div className="section-title">

                <MessageSquare
                  size={17}
                />

                Comments

              </div>


              <div className="comments-list">

                {comments.length ===
                0 ? (
                  <p className="muted">
                    No comments yet.
                  </p>
                ) : (
                  comments.map(
                    (comment) => (
                      <div
                        className="comment"
                        key={comment.id}
                      >

                        <strong>
                          User{" "}
                          {
                            comment.user_id
                          }
                        </strong>

                        <p>
                          {
                            comment.content
                          }
                        </p>

                      </div>
                    )
                  )
                )}

              </div>


              <div className="comment-input">

                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={
                    commentText
                  }
                  onChange={(e) =>
                    setCommentText(
                      e.target.value
                    )
                  }
                  onKeyDown={
                    handleCommentKeyDown
                  }
                />


                <button
                  onClick={
                    sendComment
                  }
                  title="Send comment"
                >
                  <Send size={16} />
                </button>

              </div>

            </div>

          </aside>
        )}


        {/* ===================================================
            VERSION HISTORY PANEL
        =================================================== */}

        {showHistory && (
          <aside className="history-sidebar">

            <div className="history-header">

              <div>

                <div className="history-title">

                  <History
                    size={17}
                  />

                  Version History

                </div>

                <p>
                  Previous document
                  versions
                </p>

              </div>


              <button
                className="history-close"
                onClick={() => {
                  setShowHistory(
                    false
                  );

                  setSelectedVersion(
                    null
                  );
                }}
              >
                <X size={17} />
              </button>

            </div>


            {/* LOADING */}

            {loadingVersions && (
              <div className="history-loading">

                <div className="loading-spinner" />

                Loading versions...

              </div>
            )}


            {/* EMPTY */}

            {!loadingVersions &&
              versions.length ===
                0 && (
                <div className="history-empty">

                  <History
                    size={30}
                  />

                  <h4>
                    No versions yet
                  </h4>

                  <p>
                    Document versions
                    will appear here.
                  </p>

                </div>
              )}


            {/* VERSION LIST */}

            {!loadingVersions &&
              versions.length >
                0 && (
                <div className="version-list">

                  {versions.map(
                    (
                      version,
                      index
                    ) => (
                      <button
                        key={`${version.version}-${index}`}
                        className={
                          selectedVersion?.version ===
                          version.version
                            ? "version-card selected"
                            : "version-card"
                        }
                        onClick={() =>
                          setSelectedVersion(
                            version
                          )
                        }
                      >

                        <div className="version-icon">

                          <Clock
                            size={15}
                          />

                        </div>


                        <div className="version-info">

                          <div className="version-top">

                            <strong>
                              Version{" "}
                              {
                                version.version
                              }
                            </strong>


                            {index ===
                              0 && (
                              <span className="latest-badge">
                                Latest
                              </span>
                            )}

                          </div>


                          <span className="version-date">

                            {formatDate(
                              version.created_at
                            )}

                          </span>


                          <span className="version-user">

                            User{" "}
                            {
                              version.created_by
                            }

                          </span>

                        </div>

                      </button>
                    )
                  )}

                </div>
              )}


            {/* VERSION PREVIEW */}

            {selectedVersion && (
              <div className="version-preview">

                <div className="preview-header">

                  <div>

                    <span>
                      Preview
                    </span>

                    <strong>
                      Version{" "}
                      {
                        selectedVersion.version
                      }
                    </strong>

                  </div>

                </div>


                <div className="preview-content">

                  {selectedVersion.content ||
                    "This version is empty."}

                </div>


                <button
                  className="restore-button"
                  onClick={
                    restoreVersion
                  }
                  disabled={
                    restoring
                  }
                >

                  <RotateCcw
                    size={16}
                  />

                  {restoring
                    ? "Restoring..."
                    : "Restore This Version"}

                </button>

              </div>
            )}

          </aside>
        )}

      </div>

    </div>
  );
}

export default DocumentEditor;