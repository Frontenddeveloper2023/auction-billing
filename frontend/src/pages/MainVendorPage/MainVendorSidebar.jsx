import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  House,
  Building,
  UserCog,
  ShoppingCart,
  Handshake,
  History,
  User,
  Gem,
  LogOut,
  X,
  PackagePlus,
  ChartSpline,
  PackageSearch,
  FileText,
} from "lucide-react";
import logo from "../../assets/images/logo-sidebar.png";
import { useDispatch, useSelector } from "react-redux";
import { clearVendorAuthData } from "../../redux/slices/vendorAuthSlice";
import { mainVendorLogout } from "../../api/mainVendorApi";

const MainVendorSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { branchCount } = useSelector((state) => state.vendorAuth);

  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await mainVendorLogout();
    } catch (err) {
      console.error("Logout API failed:", err);
    }
    dispatch(clearVendorAuthData());
    onClose();
    navigate("/");
  };

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="logo-icon">
            <img src={logo} alt="logo" />
          </div>
          <div className="logo-text">
            <h2>Auction Billing</h2>
            <p>Vendor Portal</p>
          </div>
        </div>
        <button className="close-sidebar" onClick={onClose} aria-label="Close Sidebar" title="Close Sidebar">
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-label">Management</div>
        <NavLink
          to="/mainvendor/dashboard"
          className={({ isActive }) => `nav-item ${isActive || location.pathname === "/mainvendor" || location.pathname === "/mainvendor/" ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <House size={18} strokeWidth={2} />
          </span>
          <span>Dashboard</span>
        </NavLink>

        {branchCount > 0 && (
          <>
            <NavLink
              to="/mainvendor/branches"
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              <span className="nav-icon">
                <Building size={18} strokeWidth={2} />
              </span>
              <span>Branches</span>
            </NavLink>

            <NavLink
              to="/mainvendor/sellers"
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              <span className="nav-icon">
                <UserCog size={18} strokeWidth={2} />
              </span>
              <span>Sellers</span>
            </NavLink>

            <NavLink
              to="/mainvendor/buyers"
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              <span className="nav-icon">
                <ShoppingCart size={18} strokeWidth={2} />
              </span>
              <span>Buyers</span>
            </NavLink>

            <NavLink
              to="/mainvendor/commission"
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              <span className="nav-icon">
                <Handshake size={18} strokeWidth={2} />
              </span>
              <span>Commission</span>
            </NavLink>

            <NavLink
              to="/mainvendor/main-history"
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              onClick={onClose}
            >
              <span className="nav-icon">
                <History size={18} strokeWidth={2} />
              </span>
              <span>History</span>
            </NavLink>
          </>
        )}

        <div className="sidebar-label">My Branch</div>
        
        <NavLink
          to="/mainvendor/add-product"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <PackagePlus size={18} strokeWidth={2} />
          </span>
          <span>Product List</span>
        </NavLink>

        <NavLink
          to="/mainvendor/today-auction"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <ChartSpline size={18} strokeWidth={2} />
          </span>
          <span>Today Auction</span>
        </NavLink>

        <NavLink
          to="/mainvendor/pending-products"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <PackageSearch size={18} strokeWidth={2} />
          </span>
          <span>Pending Products</span>
        </NavLink>

        <NavLink
          to="/mainvendor/billing"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <FileText size={18} strokeWidth={2} />
          </span>
          <span>Billing & Invoices</span>
        </NavLink>

        <NavLink
          to="/mainvendor/seller-details"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <UserCog size={18} strokeWidth={2} />
          </span>
          <span>My Sellers</span>
        </NavLink>

        <NavLink
          to="/mainvendor/buyer-details"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <ShoppingCart size={18} strokeWidth={2} />
          </span>
          <span>My Buyers</span>
        </NavLink>

        <NavLink
          to="/mainvendor/commission-record"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <Handshake size={18} strokeWidth={2} />
          </span>
          <span>My Commission</span>
        </NavLink>

        <NavLink
          to="/mainvendor/history"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <History size={18} strokeWidth={2} />
          </span>
          <span>My History</span>
        </NavLink>

        <div className="sidebar-label">Account</div>

        <NavLink
          to="/mainvendor/subscription"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <Gem size={18} strokeWidth={2} />
          </span>
          <span>Subscription</span>
        </NavLink>

        <NavLink
          to="/mainvendor/manage"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <User size={18} strokeWidth={2} />
          </span>
          <span>Profile</span>
        </NavLink>

        <a href="/" className="nav-item text-danger" onClick={handleLogout}>
          <span className="nav-icon">
            <LogOut size={18} strokeWidth={2} />
          </span>
          <span>Logout</span>
        </a>
      </nav>
    </aside>
  );
};

export default MainVendorSidebar;
