import React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  House,
  ChartSpline,
  UserCog,
  PackageSearch,
  PackagePlus,
  History,
  User,
  ShoppingCart,
  Settings,
  Handshake,
  Gem,
  LogOut,
  X,
  FileText,
} from "lucide-react";
import logo from "../../assets/images/logo-sidebar.png";
import { useDispatch } from "react-redux";
import { clearVendorAuthData } from "../../redux/slices/vendorAuthSlice";

const VendorSidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();

  const handleLogout = (e) => {
    e.preventDefault();
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
            <p>Branch Portal</p>
          </div>
        </div>
        <button className="close-sidebar" onClick={onClose} aria-label="Close Sidebar" title="Close Sidebar">
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-label">Main Menu</div>
        <NavLink
          to="/vendor/dashboard"
          className={({ isActive }) => `nav-item ${isActive || location.pathname === "/vendor" || location.pathname === "/vendor/" ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <House size={18} strokeWidth={2} />
          </span>
          <span>Dashboard</span>
        </NavLink>

        <div className="sidebar-label">Operations</div>
        <NavLink
          to="/vendor/add-product"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <PackagePlus size={18} strokeWidth={2} />
          </span>
          <span>Product List</span>
        </NavLink>

        <NavLink
          to="/vendor/today-auction"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <ChartSpline size={18} strokeWidth={2} />
          </span>
          <span>Today Auction</span>
        </NavLink>

        <NavLink
          to="/vendor/pending-products"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <PackageSearch size={18} strokeWidth={2} />
          </span>
          <span>Pending Products</span>
        </NavLink>

        <NavLink
          to="/vendor/history"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <History size={18} strokeWidth={2} />
          </span>
          <span>History</span>
        </NavLink>

        <div className="sidebar-label">Parties</div>
        <NavLink
          to="/vendor/seller-details"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <UserCog size={18} strokeWidth={2} />
          </span>
          <span>Seller Details</span>
        </NavLink>

        <NavLink
          to="/vendor/buyer-details"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <ShoppingCart size={18} strokeWidth={2} />
          </span>
          <span>Buyer Details</span>
        </NavLink>

        <div className="sidebar-label">Accounts & Billing</div>
        <NavLink
          to="/vendor/commission"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <Handshake size={18} strokeWidth={2} />
          </span>
          <span>Commission Record</span>
        </NavLink>

        <NavLink
          to="/vendor/billing"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          onClick={onClose}
        >
          <span className="nav-icon">
            <FileText size={18} strokeWidth={2} />
          </span>
          <span>Billing & Invoices</span>
        </NavLink>

        <div className="sidebar-label">Session</div>
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

export default VendorSidebar;
