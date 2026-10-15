import { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  clearSaasAuthData,
  setSaasAuthData,
} from "../../redux/slices/saasAuthSlice";
import {
  getAdminProfile,
  getAdminNotifications,
  markNotificationAsRead,
  adminLogout,
} from "../../api/adminApi";
import {
  House,
  ShoppingCart,
  Users,
  Gem,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  User,
  Lock,
  ExternalLink,
  Mail,
} from "lucide-react";
import "./SaaSAdmin.css";

const SaaSLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const profileRef = useRef(null);
  const notificationRef = useRef(null);
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const { saasAdminPhoto, saasAdminName, isAdmin, saasRole, saasPermissions } =
    useSelector((state) => state.saasAuth);

  const [adminPhoto, setAdminPhoto] = useState(saasAdminPhoto || null);
  const [adminName, setAdminName] = useState(saasAdminName || "Super Admin");

  // Close dropdown when clicking outside and handle profile photo updates
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationOpen(false);
      }
    };

    const handleProfileUpdate = () => {
      setAdminPhoto(localStorage.getItem("saas_admin_photo") || null);
      setAdminName(localStorage.getItem("saas_admin_name") || "Super Admin");
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("saas_profile_updated", handleProfileUpdate);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("saas_profile_updated", handleProfileUpdate);
    };
  }, []);

  // Fetch notifications
  const fetchNotifications = () => {
    getAdminNotifications()
      .then((res) => {
        if (res.status) {
          setNotifications(res.notifications || []);
          setUnreadCount(res.notifications?.length || 0);
        }
      })
      .catch((err) => console.error("Error fetching notifications:", err));
  };

  useEffect(() => {
    if (isAdmin) {
      fetchNotifications();
      // Poll notifications every 30 seconds
      const nIntervalId = setInterval(fetchNotifications, 30000);
      return () => clearInterval(nIntervalId);
    }
  }, [isAdmin]);

    useEffect(() => {
    document.body.classList.add("saas-admin-active");

    // Check for auth token using Redux mapped local storage originally
    if (!isAdmin) {
      navigate("/saas-admin");
    }

    return () => {
      document.body.classList.remove("saas-admin-active");
    };
  }, [navigate, location.pathname, isAdmin]);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await markNotificationAsRead(id);
      if (res.status) {
        setNotifications((prev) => prev.filter((n) => n._id !== id));
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleLogout = async() => {
    try {
      const res = await adminLogout();
      if (res.status) {
        dispatch(clearSaasAuthData());
        navigate("/saas-admin");
      }
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const isSubAdmin = saasRole === "sub-admin" || saasRole === "subadmin";

  let navItems = [
    { path: "/saas", label: "Dashboard", icon: <House size={20} /> },
    {
      path: "/saas/purchases",
      label: "Purchases",
      icon: <ShoppingCart size={20} />,
    },
    { path: "/saas/vendors", label: "Vendors", icon: <Users size={20} /> },
    {
      path: "/saas/subscriptions",
      label: "Subscriptions",
      icon: <Gem size={20} />,
    },
    { path: "/saas/subadmins", label: "Sub-Admins", icon: <Users size={20} /> },
    { path: "/saas/templates", label: "Template", icon: <Mail size={20} /> },
    { path: "/saas/settings", label: "Profile", icon: <User size={20} /> },
    {
      path: "/saas/change-password",
      label: "Change Password",
      icon: <Lock size={20} />,
    },
  ];

  if (isSubAdmin) {
    navItems = navItems.filter((item) => {
      if (item.path === "/saas/settings") return false;
      if (item.path === "/saas/subadmins") return false;
      if (item.path === "/saas/templates") return false;
      // Always allow sub-admins to change their own password
      if (item.path === "/saas/change-password") return true;
      return true;
    });
  }

  return (
    <div className="saas-layout">
      {/* Sidebar Overlay */}
      <div
        className={`saas-overlay ${isSidebarOpen ? "show" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`saas-sidebar ${isSidebarOpen ? "open" : ""}`}>
        <div className="saas-sidebar-header">
          <div className="saas-logo">Main Admin</div>
          <button
            className="saas-close-sidebar"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="saas-nav">
          {navItems.map((item) => {
            const isActive = item.path === "/saas" 
              ? (location.pathname === "/saas" || location.pathname === "/saas/" || location.pathname === "/saas/dashboard")
              : location.pathname === item.path;
              
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`saas-nav-item ${isActive ? "active" : ""}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="saas-sidebar-footer">
          <div className="saas-nav-item logout-btn" onClick={handleLogout}>
            <span className="nav-icon">
              <LogOut size={20} />
            </span>
            <span>Logout</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="saas-main">
        <header className="saas-header">
          <div className="saas-header-left">
            <button
              className="saas-mobile-toggle"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="saas-header-title-text">
              {navItems.find((n) => {
                if (n.path === "/saas") {
                  return location.pathname === "/saas" || location.pathname === "/saas/" || location.pathname === "/saas/dashboard";
                }
                return n.path === location.pathname;
              })?.label || "Admin"}
            </h2>
          </div>
          <div className="saas-header-right">
            <div className="saas-header-right-content">
              <div
                className="saas-notification-container"
                ref={notificationRef}
              >
                <button
                  className={`saas-btn btn-sm btn-outline icon-only ${unreadCount > 0 ? "has-badge" : ""}`}
                  onClick={() => setNotificationOpen(!notificationOpen)}
                >
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                  )}
                </button>

                {notificationOpen && (
                  <div className="saas-notification-dropdown">
                    <div className="notification-dropdown-header">
                      <h4 className="notification-dropdown-title">
                        Notifications
                      </h4>
                      <span className="notification-count1">
                        {unreadCount} Unread
                      </span>
                    </div>

                    <div className="notification-list">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div key={notif._id} className="notification-item">
                            <div className="notif-content">
                              {/* <div className="notif-title">
                                {notif.userId?.name ||
                                  notif.senderName ||
                                  "Unknown Vendor"}
                              </div>
                              <div className="notif-email">
                                {notif.userId?.email || ""}
                              </div> */}
                              <div
                                className="notif-subject"
                                style={{
                                  fontWeight: "600",
                                  fontSize: "0.85rem",
                                  color: "#1e293b",
                                  marginTop: "4px",
                                }}
                              >
                                {notif.title}
                              </div>
                              <p className="notif-msg">{notif.message}</p>
                              <div className="notif-meta">
                                <span className="notif-type">
                                  {notif.type === "plan_upgrade"
                                    ? "Plan Upgrade"
                                    : notif.type === "new_registration"
                                      ? "New Registration"
                                      : notif.type === "asset_upgrade"
                                        ? "Asset Upgrade"
                                        : "Notification"}
                                </span>
                                <span className="notif-time">
                                  {new Date(
                                    notif.createdAt,
                                  ).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="notif-actions">
                              <button
                                className="notif-btn more-btn"
                                onClick={() => {
                                  navigate("/saas/vendors");
                                  setNotificationOpen(false);
                                  handleMarkAsRead(notif._id);
                                }}
                              >
                                <ExternalLink size={14} />
                                More
                              </button>
                              <button
                                className="notif-btn read-btn"
                                onClick={() => handleMarkAsRead(notif._id)}
                              >
                                Mark as read
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="notification-empty">
                          <Bell size={32} className="empty-icon" />
                          <p>No new notifications</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="saas-header-profile-container" ref={profileRef}>
                <div
                  className="saas-header-profile"
                  onClick={() => setProfileOpen(!profileOpen)}
                >
                  {adminPhoto ? (
                    <img
                      src={adminPhoto}
                      alt="SA"
                      className="saas-header-avatar"
                    />
                  ) : (
                    <div className="saas-header-avatar-fallback">
                      {adminName.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {profileOpen && (
                  <div className="saas-profile-dropdown">
                    <div className="saas-dropdown-header">
                      {adminPhoto ? (
                        <img
                          src={adminPhoto}
                          alt="SA"
                          className="saas-dropdown-avatar"
                        />
                      ) : (
                        <div className="saas-dropdown-avatar-fallback">
                          {adminName.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="saas-dropdown-name">{adminName}</div>
                    </div>

                    {!isSubAdmin && (
                      <div
                        className="saas-dropdown-item"
                        onClick={() => {
                          navigate("/saas/settings");
                          setProfileOpen(false);
                        }}
                      >
                        <User size={16} />
                        <span className="saas-dropdown-item-text">Profile</span>
                      </div>
                    )}
                    {!isSubAdmin && (
                      <div className="saas-dropdown-divider"></div>
                    )}
                    <div
                      className="saas-dropdown-item text-danger"
                      onClick={handleLogout}
                    >
                      <LogOut size={16} />
                      <span className="saas-dropdown-item-text">Logout</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="saas-scroll-wrapper">
          <section className="saas-content">
            <Outlet />
          </section>
        </div>
      </main>
    </div>
  );
};

export default SaaSLayout;
