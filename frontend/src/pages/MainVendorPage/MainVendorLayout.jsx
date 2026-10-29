import React, { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import MainVendorSidebar from "./MainVendorSidebar.jsx";
import "./MainVendor.css";
import logo from "../../assets/images/logo.png";
import user from "../../assets/images/user.png";
import { LogOut, User, KeyRound, ArrowLeft, CalendarDays } from "lucide-react";
import { googleLogout } from "@react-oauth/google";
import { useSelector, useDispatch } from "react-redux";
import { clearVendorAuthData, setVendorBranchCount } from "../../redux/slices/vendorAuthSlice.js";
import { resolveImageUrl } from "../../utils/imageUtils.js";
import { getMainVendorProfile, mainVendorLogout } from "../../api/mainVendorApi.js";
import Notification from "../../components/Common/Notification.jsx";
import BottomNavbar from "../../components/Common/BottomNavbar.jsx";
import { toast } from "react-toastify";

const MainVendorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Assuming reuse vendor auth for now, or create mainVendor slice later
  const {
    vendorLoggedIn,
    vendorUserName,
    vendorUserEmail,
    vendorUserPhoto,
    vendorId,
  } = useSelector((state) => state.vendorAuth);

  const isSessionActive =
    sessionStorage.getItem("vendorLoggedIn") === "true" ||
    localStorage.getItem("vendorLoggedIn") === "true";

  const isLoggedIn = vendorLoggedIn || isSessionActive;

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/");
    }
  }, [isLoggedIn, navigate]);

  const fallbackVendorId = sessionStorage.getItem("vendorId");
  const currentVendorId = vendorId || fallbackVendorId;

  const handleLogout = async () => {
    try {
      googleLogout();
      await mainVendorLogout();
    } catch (err) {
      console.error("Logout error:", err);
    }
    dispatch(clearVendorAuthData());
    setProfileOpen(false);
    navigate("/");
  };

  // Subscription info for the top banner across all pages
  const [subStatus, setSubStatus] = useState(null);

  // Subscription check - adjust for mainVendor
  useEffect(() => {
    const checkSubscription = async () => {
      if (isLoggedIn && currentVendorId) {
        try {
          const res = await getMainVendorProfile(currentVendorId);
          if (res.status && res.vendor) {
            const currentVendor = res.vendor;

            const activeSub = currentVendor.activeSubscription;
            const latestBranchCount = activeSub?.branchCount ?? currentVendor.plan?.branchCount ?? 0;
            
            dispatch(setVendorBranchCount(latestBranchCount));

            const expiryDate = currentVendor.planEndDate || activeSub?.endDate;
            const planName = activeSub?.planName || currentVendor.plan?.planName || currentVendor.planName || "Active Plan";

            if (expiryDate) {
              const today = new Date();
              const expiry = new Date(expiryDate);
              const diffTime = expiry - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              const isExtended = !!currentVendor.isPlanExtended;
              const extendedAt = currentVendor.planExtendedAt;

              if (diffDays <= 0) {
                console.log("Subscription expired: Read-only mode activated");
                setSubStatus({
                  planName,
                  expiryDate,
                  diffDays: 0,
                  isExpired: true,
                  isExpiringSoon: false,
                  isExtended: false,
                });
                // Do not logout! User can still browse and view pages, and access subscription page.
              } else {
                setSubStatus({
                  planName,
                  expiryDate,
                  diffDays,
                  isExpired: false,
                  isExpiringSoon: diffDays <= 7,
                  isExtended,
                  extendedAt,
                });

                // Show Toast Immediately once when plan was extended by admin
                if (isExtended) {
                  const toastKey = `plan_extended_notified_${new Date(expiryDate).getTime()}`;
                  if (sessionStorage.getItem(toastKey) !== "shown") {
                    sessionStorage.setItem(toastKey, "shown");
                    const formattedExpiry = new Date(expiryDate).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });
                    toast.success(
                      `🎉 Plan Extended! Your plan has been extended till ${formattedExpiry}.`,
                      {
                        toastId: "plan-extended-toast",
                        autoClose: 6000,
                      }
                    );
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Error checking subscription:", error);
        }
      }
    };

    checkSubscription();
  }, [isLoggedIn, currentVendorId]);

  const lastToastTimeRef = useRef(0);

  // Capture clicks when plan is expired on any page except subscription
  const handleMainContentClickCapture = (e) => {
    if (!subStatus?.isExpired) return;

    // Subscription page is fully accessible for renewals/upgrades
    if (location.pathname.startsWith("/mainvendor/subscription")) return;

    // Check if the click target is or is inside an interactive action element (button, input, form submit, etc.)
    const actionEl = e.target.closest(
      'button, a:not([href^="/mainvendor"]):not([href*="mainvendor"]), input, select, textarea, [role="button"], .btn, .action-btn, .btn-primary, .btn-danger, .btn-success, .edit-btn, .delete-btn'
    );

    if (actionEl) {
      // If it's a navigation link inside the app, allow viewing
      if (actionEl.tagName === "A" && actionEl.getAttribute("href")?.startsWith("/")) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const now = Date.now();
      if (now - lastToastTimeRef.current > 2500) {
        lastToastTimeRef.current = now;
        toast.warning("Plan expired. Please renew subscription to perform actions.", {
          toastId: "plan-expired-warning",
          autoClose: 3000,
        });
      }
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleProfile = () => {
    setProfileOpen(!profileOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (!isLoggedIn) return null;

  const userName =
    vendorUserName || sessionStorage.getItem("vendorUserName") || "Vendor";
  const userPhoto =
    vendorUserPhoto || sessionStorage.getItem("vendorUserPhoto") || user;
  const userEmail =
    vendorUserEmail || sessionStorage.getItem("vendorUserEmail");

  const location = useLocation();
  const isDashboard =
    location.pathname === "/mainvendor" ||
    location.pathname === "/mainvendor/" ||
    location.pathname === "/mainvendor/dashboard";
  const isNotDashboard = !isDashboard;

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/mainvendor/dashboard");
    }
  };

  const formatExpiryDate = (d) => {
    if (!d) return "";
    try {
      const dt = new Date(d);
      return dt.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return String(d);
    }
  };

  return (
    <div className="app-container">
      {/* Mobile Header */}
      <div className="mobile-header">
        <button className="menu-toggle" onClick={toggleSidebar}>
          ☰
        </button>

        <div className="header-logo">
          <img src={logo} alt="Logo" />
          <h2>Auction Billing</h2>
        </div>

        <div className="header-actions">
          <Notification />

          <div className="header-profile-container" ref={profileRef}>
            <div className="header-profile" onClick={toggleProfile}>
              <p>{userName}</p>
              <img
                src={resolveImageUrl(userPhoto, user)}
                alt="User"
                referrerPolicy="no-referrer"
                className="header-profile-img"
                onError={(e) => {
                  e.target.src = user;
                }}
              />
            </div>

            {profileOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <img
                    src={resolveImageUrl(userPhoto, user)}
                    alt="Profile"
                    className="profile-dropdown-img"
                    onError={(e) => {
                      e.target.src = user;
                    }}
                  />
                  <div className="profile-dropdown-name">{userName}</div>
                  <div className="profile-dropdown-email">{userEmail}</div>
                </div>

                <div
                  className="dropdown-item"
                  onClick={() => {
                    navigate("/mainvendor/manage");
                    setProfileOpen(false);
                  }}
                >
                  <User size={16} />
                  <span>My Profile</span>
                </div>
                <div
                  className="dropdown-item text-danger"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global Plan Expiry Top Banner (Visible across all pages, No buttons) */}
      {subStatus && (
        <div className={`mv-top-expiry-strip ${subStatus.isExpired ? "expired" : subStatus.isExpiringSoon ? "expiring" : "active"}`}>
          <div className="mv-strip-badge">
            <CalendarDays size={14} />
            <span>
              {subStatus.isExpired
                ? "Expired"
                : subStatus.isExtended
                ? `Extended (${subStatus.diffDays}d Left)`
                : `${subStatus.diffDays} Days Left`}
            </span>
          </div>
          <div className="mv-strip-text">
            <strong>
              {subStatus.isExpired
                ? `Subscription Expired (${subStatus.planName})`
                : subStatus.isExtended
                ? `Plan Extended (${subStatus.planName})`
                : `Plan Active (${subStatus.planName})`}
            </strong>
            <span className="mv-strip-divider">•</span>
            <span>
              {subStatus.isExpired
                ? "Your subscription cycle has ended."
                : subStatus.isExtended
                ? `Extended till ${formatExpiryDate(subStatus.expiryDate)} (${subStatus.diffDays} days remaining)`
                : subStatus.isExpiringSoon
                  ? `Valid till ${formatExpiryDate(subStatus.expiryDate)}. Only ${subStatus.diffDays} days remaining.`
                  : `Valid till ${formatExpiryDate(subStatus.expiryDate)} (${subStatus.diffDays} days remaining)`}
            </span>
          </div>
        </div>
      )}

      {/* Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "show" : ""}`}
        onClick={closeSidebar}
      ></div>

      {/* Sidebar */}
      <MainVendorSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Main Content */}
      <main
        className={`main-content ${subStatus?.isExpired && !location.pathname.startsWith("/mainvendor/subscription") ? "plan-expired-mode" : ""}`}
        onClickCapture={handleMainContentClickCapture}
      >
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <BottomNavbar />
    </div>
  );
};

export default MainVendorLayout;
