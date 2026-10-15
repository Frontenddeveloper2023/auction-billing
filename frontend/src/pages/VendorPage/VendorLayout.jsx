import React, { useState, useRef, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import VendorSidebar from "./VendorSidebar.jsx";
import "./Vendor.css";
import logo from "../../assets/images/logo.png";
import user from "../../assets/images/user.png";
import { LogOut, User, KeyRound, ArrowLeft } from "lucide-react";
import { googleLogout } from '@react-oauth/google';
import { useSelector, useDispatch } from "react-redux";
import { clearVendorAuthData } from "../../redux/slices/vendorAuthSlice";
import { resolveImageUrl } from "../../utils/imageUtils";
import { getVendorProfile } from "../../api/vendorApi";
import Notification from "../../components/Common/Notification";
import BottomNavbar from "../../components/Common/BottomNavbar";

const VendorLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { vendorLoggedIn, vendorUserName, vendorUserEmail, vendorUserPhoto, vendorId } = useSelector(state => state.vendorAuth);

  // Also provide a session fallback check in case Redux unmounts right before router handles
  const isSessionActive = sessionStorage.getItem("vendorLoggedIn") === "true" || localStorage.getItem("vendorLoggedIn") === "true";

  const isLoggedIn = vendorLoggedIn || isSessionActive;

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/");
    }
  }, [isLoggedIn, navigate]);

  const fallbackVendorId = sessionStorage.getItem('vendorId');
  const currentVendorId = vendorId || fallbackVendorId;

  const handleLogout = () => {
    googleLogout(); // Sign out from Google
    dispatch(clearVendorAuthData());

    setProfileOpen(false);
    navigate("/");
  };

  // Global subscription check
  useEffect(() => {
    const checkSubscription = async () => {
      if (isLoggedIn && currentVendorId) {
        try {
          const res = await getVendorProfile(currentVendorId);
          if (res.status && res.vendor) {
            const currentVendor = res.vendor;
            
            // Allow if status is somehow not Active maybe? But backend blocks inactive anyway
            const activeSub = currentVendor.activeSubscription;
            const expiryDate = activeSub?.endDate || currentVendor.planEndDate;
            
            if (expiryDate) {
              const today = new Date();
              const expiry = new Date(expiryDate);
              const diffTime = expiry - today;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              if (diffDays <= 0) {
                console.log("Subscription expired");
                handleLogout();
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

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Profile dropdown toggles
  const toggleProfile = () => {
    setProfileOpen(!profileOpen);
  };

  // Close dropdown when clicking outside
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

  // If not logged in, don't render anything (prevents flash of content)
  if (!isLoggedIn) return null;

  // Retrieve user info
  const userName = vendorUserName || sessionStorage.getItem('vendorUserName') || "Vendor";
  const userPhoto = vendorUserPhoto || sessionStorage.getItem('vendorUserPhoto') || user;
  const userEmail = vendorUserEmail || sessionStorage.getItem('vendorUserEmail');


  const location = useLocation();
  const isDashboard =
    location.pathname === "/vendor" ||
    location.pathname === "/vendor/" ||
    location.pathname === "/vendor/dashboard";
  const isNotDashboard = !isDashboard;

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate("/vendor/dashboard");
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
          <h2>{userName} Branch</h2>
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
                onError={(e) => { e.target.src = user }}
              />
            </div>

            {profileOpen && (
              <div className="profile-dropdown">
                {/* Dropdown Header with Profile Info */}
                <div className="profile-dropdown-header">
                  <img
                    src={resolveImageUrl(userPhoto, user)}
                    alt="Profile"
                    className="profile-dropdown-img"
                    onError={(e) => { e.target.src = user }}
                  />
                  <div className="profile-dropdown-name">{userName}</div>
                  <div className="profile-dropdown-email">{userEmail}</div>
                </div>

                {/* <div className="dropdown-item" onClick={() => {
                  navigate('/vendor/manage');
                  setProfileOpen(false);
                }}>
                  <User size={16} />
                  <span>My Profile</span>
                </div>
                <div className="dropdown-item" onClick={() => {
                  navigate('/vendor/change-password');
                  setProfileOpen(false);
                }}>
                  <KeyRound size={16} />
                  <span>Change Password</span>
                </div> */}

              
                <div className="dropdown-item text-danger" onClick={handleLogout}>
                  <LogOut size={16} />
                  <span>Logout</span>
                </div>
              </div>
            )}
          </div>

          
        </div>
      </div>
      


      {/* Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={closeSidebar}
      ></div>

      {/* Sidebar */}
      <VendorSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <BottomNavbar />
    </div>
  );
};

export default VendorLayout;
