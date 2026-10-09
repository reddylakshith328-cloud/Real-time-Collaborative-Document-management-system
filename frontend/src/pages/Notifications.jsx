import { useEffect, useState } from "react";

import {
  FileText,
  Folder,
  Bell,
  Users,
  LogOut,
  ArrowLeft,
  Check,
  CheckCheck,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";

import API from "../services/api";

import "./Notifications.css";


function Notifications({
  onBack,
  onLogout,
}) {

  const [notifications, setNotifications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  const token =
    localStorage.getItem(
      "access_token"
    );


  // =========================================================
  // LOAD NOTIFICATIONS
  // =========================================================

  const loadNotifications = async () => {

    setLoading(true);
    setError("");

    try {

      const response =
        await API.get(
          "/notifications/",
          {
            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );


      const data =
        response.data;


      if (Array.isArray(data)) {

        setNotifications(data);

      } else if (
        Array.isArray(
          data?.notifications
        )
      ) {

        setNotifications(
          data.notifications
        );

      } else {

        setNotifications([]);

      }

    } catch (err) {

      console.error(
        "Failed to load notifications:",
        err
      );

      setError(
        err.response?.data?.detail ||
        "Failed to load notifications"
      );

    } finally {

      setLoading(false);

    }

  };


  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {

    loadNotifications();

  }, []);


  // =========================================================
  // MARK ALL AS READ
  // =========================================================

  const markAllAsRead = async () => {

    try {

      await API.put(
        "/notifications/read-all",
        {},
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );


      setNotifications(
        (previous) =>
          previous.map(
            (notification) => ({
              ...notification,

              is_read: true,

              read: true,
            })
          )
      );

    } catch (err) {

      console.error(
        "Failed to mark notifications as read:",
        err
      );

      setError(
        err.response?.data?.detail ||
        "Failed to mark notifications as read"
      );

    }

  };


  // =========================================================
  // HELPERS
  // =========================================================

  const isRead = (
    notification
  ) => {

    return (
      notification.is_read === true ||
      notification.read === true
    );

  };


  const getTitle = (
    notification
  ) => {

    return (
      notification.title ||
      notification.type ||
      "Notification"
    );

  };


  const getMessage = (
    notification
  ) => {

    return (
      notification.message ||
      notification.content ||
      "You have a new notification."
    );

  };


  const formatDate = (
    value
  ) => {

    if (!value) {
      return "";
    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "";

    }


    return date.toLocaleString();

  };


  const unreadCount =
    notifications.filter(
      (notification) =>
        !isRead(notification)
    ).length;


  // =========================================================
  // LOGOUT
  // =========================================================

  const handleLogout = () => {

    if (onLogout) {

      onLogout();

      return;

    }


    localStorage.removeItem(
      "access_token"
    );

    localStorage.removeItem(
      "token_type"
    );

    window.location.reload();

  };


  // =========================================================
  // UI
  // =========================================================

  return (

    <div className="notifications-app">


      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="notifications-sidebar">


        {/* BRAND */}

        <div className="notifications-brand">

          <div className="notifications-brand-icon">

            <FileText size={21} />

          </div>


          <div>

            <span className="notifications-brand-name">
              DocuSphere
            </span>

            <span className="notifications-brand-subtitle">
              DOCUMENT INTELLIGENCE
            </span>

          </div>

        </div>


        <div className="notifications-sidebar-divider" />


        {/* NAVIGATION */}

        <nav className="notifications-nav">


          {/* DOCUMENTS */}

          <button
            className="notifications-nav-item"
            onClick={onBack}
          >

            <FileText size={18} />

            <span>
              Documents
            </span>

          </button>


          {/* FOLDERS */}

          <button
            className="notifications-nav-item"
            onClick={onBack}
          >

            <Folder size={18} />

            <span>
              Folders
            </span>

          </button>


          {/* COLLABORATORS */}

          <button
            className="notifications-nav-item"
            onClick={onBack}
          >

            <Users size={18} />

            <span>
              Collaborators
            </span>

          </button>


          {/* NOTIFICATIONS */}

          <button
            className="notifications-nav-item notifications-nav-active"
          >

            <Bell size={18} />

            <span>
              Notifications
            </span>

            <span className="notifications-nav-badge">
              {unreadCount}
            </span>

          </button>


        </nav>


        {/* SIDEBAR BOTTOM */}

        <div className="notifications-sidebar-bottom">


          <div className="notifications-system-status">

            <span className="notifications-status-dot" />

            <div>

              <strong>
                System Online
              </strong>

              <span>
                All services operational
              </span>

            </div>

          </div>


          <button
            className="notifications-logout"
            onClick={handleLogout}
          >

            <LogOut size={17} />

            <span>
              Logout
            </span>

          </button>


        </div>


      </aside>


      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <main className="notifications-content">


        {/* ===================================================
            TOP BAR
        =================================================== */}

        <header className="notifications-topbar">


          <div className="notifications-page-heading">


            <div className="notifications-eyebrow">
              WORKSPACE
            </div>


            <h1>
              Notifications
            </h1>


            <p>
              Stay updated with activity
              in your workspace.
            </p>


          </div>


          <div className="notifications-top-actions">


            <button
              className="notifications-refresh"
              onClick={
                loadNotifications
              }
              disabled={loading}
            >

              <RefreshCw
                size={17}
                className={
                  loading
                    ? "notifications-spin"
                    : ""
                }
              />

              <span>
                Refresh
              </span>

            </button>


          </div>


        </header>


        {/* ===================================================
            PAGE BODY
        =================================================== */}

        <section className="notifications-body">


          {/* BACK */}

          <button
            className="notifications-back"
            onClick={onBack}
          >

            <ArrowLeft size={16} />

            <span>
              Back to Documents
            </span>

          </button>


          {/* =================================================
              STATS
          ================================================= */}

          <div className="notifications-stats">


            <div className="notifications-stat-card">

              <div className="notifications-stat-icon blue">

                <Bell size={19} />

              </div>


              <div className="notifications-stat-info">

                <span>
                  NOTIFICATIONS
                </span>

                <strong>
                  {notifications.length}
                </strong>

              </div>


              <ArrowUpRight
                size={17}
                className="notifications-stat-arrow"
              />

            </div>


            <div className="notifications-stat-card">

              <div className="notifications-stat-icon purple">

                <Bell size={19} />

              </div>


              <div className="notifications-stat-info">

                <span>
                  UNREAD
                </span>

                <strong>
                  {unreadCount}
                </strong>

              </div>


              <ArrowUpRight
                size={17}
                className="notifications-stat-arrow"
              />

            </div>


            <div className="notifications-stat-card">

              <div className="notifications-stat-icon green">

                <CheckCheck size={19} />

              </div>


              <div className="notifications-stat-info">

                <span>
                  STATUS
                </span>

                <strong>
                  {unreadCount > 0
                    ? "New Activity"
                    : "All Caught Up"}
                </strong>

              </div>


              <span className="notifications-live-dot">
                ●
              </span>

            </div>


          </div>


          {/* =================================================
              HEADER
          ================================================= */}

          <div className="notifications-section-header">


            <div>

              <h2>
                Recent Activity
              </h2>

              <p>
                Notifications from your
                collaborative workspace
              </p>

            </div>


            {unreadCount > 0 && (

              <button
                className="notifications-mark-read"
                onClick={
                  markAllAsRead
                }
              >

                <CheckCheck size={16} />

                Mark all as read

              </button>

            )}


          </div>


          {/* =================================================
              ERROR
          ================================================= */}

          {error && (

            <div className="notifications-error">

              {error}

            </div>

          )}


          {/* =================================================
              LOADING
          ================================================= */}

          {loading && (

            <div className="notifications-state-card">

              <div className="notifications-state-icon">

                <RefreshCw
                  size={28}
                  className="notifications-spin"
                />

              </div>


              <h3>
                Loading workspace activity...
              </h3>


              <p>
                Checking for new notifications.
              </p>

            </div>

          )}


          {/* =================================================
              EMPTY
          ================================================= */}

          {!loading &&
            notifications.length === 0 && (

              <div className="notifications-state-card">

                <div className="notifications-state-icon">

                  <Bell size={28} />

                </div>


                <h3>
                  No notifications
                </h3>


                <p>
                  You're all caught up.
                </p>

              </div>

            )}


          {/* =================================================
              LIST
          ================================================= */}

          {!loading &&
            notifications.length > 0 && (

              <div className="notifications-list">


                {notifications.map(
                  (
                    notification,
                    index
                  ) => {

                    const read =
                      isRead(
                        notification
                      );


                    return (

                      <article
                        key={
                          notification.id ||
                          notification._id ||
                          index
                        }
                        className={
                          read
                            ? "notifications-item"
                            : "notifications-item notifications-item-unread"
                        }
                      >


                        <div className="notifications-item-icon">

                          <Bell size={19} />

                        </div>


                        <div className="notifications-item-content">


                          <div className="notifications-item-title-row">

                            <h3>
                              {getTitle(
                                notification
                              )}
                            </h3>


                            {!read && (

                              <span className="notifications-new">

                                NEW

                              </span>

                            )}

                          </div>


                          <p>
                            {getMessage(
                              notification
                            )}
                          </p>


                          <div className="notifications-item-footer">

                            <span>
                              {formatDate(
                                notification.created_at ||
                                notification.timestamp ||
                                notification.createdAt
                              )}
                            </span>


                            {!read && (

                              <span className="notifications-unread">

                                <Check size={13} />

                                Unread

                              </span>

                            )}

                          </div>


                        </div>


                      </article>

                    );

                  }
                )}


              </div>

            )}


        </section>


      </main>


    </div>

  );

}


export default Notifications;