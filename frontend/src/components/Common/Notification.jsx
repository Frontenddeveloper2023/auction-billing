import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  getVendorNotifications,
  markNotificationAsRead as markVendorNotificationAsRead,
} from "../../api/vendorApi";
import { getAdminNotifications } from "../../api/adminApi";
import "./Notification.css";
import { Bell, Check } from "lucide-react";

const Notification = ({ expiryDate: propsExpiryDate }) => {
  const { vendorId } = useSelector((state) => state.vendorAuth);
  const { isAdmin } = useSelector((state) => state.saasAuth);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    // Determine which API to use based on auth state
    if (vendorId || isAdmin) {
      try {
        const data = isAdmin
          ? await getAdminNotifications()
          : await getVendorNotifications();

        if (data && data.status && data.notifications) {
          const formatted = data.notifications.map((n) => {
            let icon = "🔔";
            let typeClass = "info";

            // Map icons based on types
            if (n.type === "plan_upgrade") {
              icon = "⭐";
              typeClass = "success";
            } else if (n.type === "asset_upgrade") {
              icon = "💎";
              typeClass = "primary";
            } else if (
              n.type === "new_registration" ||
              n.type === "signup_request"
            ) {
              icon = "🎉";
              typeClass = "success";
            } else if (
              n.type === "subscription_alert" ||
              n.type === "expiry_warning"
            ) {
              icon = "⚠️";
              typeClass = "warning";
            } else if (n.type === "other") {
              icon = "ℹ️";
              typeClass = "info";
            }

            if (
              n.title === "Subscription Expired" ||
              n.title?.includes("Expired")
            ) {
              icon = "🚫";
              typeClass = "danger";
            }

            // Display sender name if available for admin notifications
            const displayTitle = n.title;
            const displayMessage = n.message;

            // Format time - show date and time
            const dateObj = new Date(n.createdAt);
            const timeStr = `${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

            return {
              id: n._id,
              type: typeClass,
              icon,
              title: displayTitle,
              message: displayMessage,
              time: timeStr,
              link: n.link || null,
              isRead: n.isRead,
              sender: n.senderName || n.userId?.name || null,
            };
          });

          setNotifications(formatted);
          setUnreadCount(formatted.filter((n) => !n.isRead).length);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 1 minute for new notifications
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [vendorId, isAdmin]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation();
    try {
      await markVendorNotificationAsRead(id);
      // Update local state instead of removing, to show "read" status
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark read:", error);
    }
  };

  const handleNotificationClick = async (notif) => {
    // Mark as read when clicked
    if (!notif.isRead) {
      try {
        await markVendorNotificationAsRead(notif.id);
      } catch (err) {
        console.error("Failed to mark read on click:", err);
      }
    }

    if (notif.link) {
      navigate(notif.link);
    } else if (isAdmin && notif.type === "new_registration") {
      navigate("/saas/vendors");
    }

    setIsOpen(false);
    fetchNotifications();
  };

  return (
    <div className="notification-icon-container" ref={dropdownRef}>
      <div
        className="icon-btn"
        onClick={handleToggle}
        style={{ position: "relative" }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-count">{unreadCount}</span>
        )}
      </div>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-header">
            <span>Notifications</span>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              {unreadCount} Unread
            </span>
          </div>
          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">No notifications</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`notification-item ${notif.type} ${notif.isRead ? "read" : "unread"}`}
                  onClick={() => handleNotificationClick(notif)}
                >
                  <div className="notification-icon">{notif.icon}</div>
                  <div className="notification-content">
                    <div className="notification-title">
                      {notif.title}
                      {!notif.isRead && (
                        <button
                          className="mark-read-btn"
                          title="Mark as read"
                          onClick={(e) => handleMarkAsRead(e, notif.id)}
                        >
                          <Check size={14} />
                        </button>
                      )}
                    </div>
                    {notif.sender && (
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          color: "#475569",
                          marginBottom: "2px",
                        }}
                      >
                        From: {notif.sender}
                      </div>
                    )}
                    <div className="notification-message">{notif.message}</div>
                    <div className="notification-time">{notif.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notification;
