import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  UserCog,
  PackagePlus,
  Gavel,
  Users,
  Handshake,
} from "lucide-react";
import "./BottomNavbar.css";

const BottomNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isMainVendor = location.pathname.startsWith("/mainvendor");
  const currentPath = location.pathname;

  const navItems = [
    {
      id: "sellers",
      label: "Sellers",
      icon: UserCog,
      path: isMainVendor ? "/mainvendor/seller-details" : "/vendor/seller-details",
      isActive: currentPath.includes("seller"),
    },
    {
      id: "products",
      label: "Products",
      icon: PackagePlus,
      path: isMainVendor ? "/mainvendor/add-product" : "/vendor/add-product",
      isActive:
        currentPath.includes("add-product") ||
        (currentPath.includes("product") && !currentPath.includes("pending")),
    },
    {
      id: "auction",
      label: "Auction",
      icon: Gavel,
      path: isMainVendor ? "/mainvendor/today-auction" : "/vendor/today-auction",
      isActive:
        currentPath.includes("today-auction") ||
        currentPath.includes("auction"),
      isCenter: true,
    },
    {
      id: "buyers",
      label: "Buyers",
      icon: Users,
      path: isMainVendor ? "/mainvendor/buyer-details" : "/vendor/buyer-details",
      isActive: currentPath.includes("buyer"),
    },
    {
      id: "commission",
      label: "Commission",
      icon: Handshake,
      path: isMainVendor ? "/mainvendor/commission-record" : "/vendor/commission",
      isActive: currentPath.includes("commission"),
    },
  ];

  return (
    <>
      <nav className="bottom-navbar" role="navigation" aria-label="Bottom Navigation">
        <div className="bottom-navbar-content">
          {navItems.map((item) => {
            const Icon = item.icon;

            if (item.isCenter) {
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`bottom-nav-item bottom-nav-center-wrap ${
                    item.isActive ? "active" : ""
                  }`}
                  onClick={() => navigate(item.path)}
                  title={item.label}
                >
                  <div
                    className={`bottom-nav-center-btn ${
                      item.isActive ? "active" : ""
                    }`}
                  >
                    <Icon className="bottom-nav-center-icon" strokeWidth={2.4} />
                  </div>
                  <span className="bottom-nav-label center-label">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                className={`bottom-nav-item ${item.isActive ? "active" : ""}`}
                onClick={() => navigate(item.path)}
                title={item.label}
              >
                <div className="bottom-nav-icon-wrap">
                  <Icon className="bottom-nav-icon" strokeWidth={item.isActive ? 2.3 : 1.8} />
                </div>
                <span className="bottom-nav-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      {/* Spacer to preserve document layout and prevent bottom content from being covered */}
      <div className="bottom-navbar-spacer" aria-hidden="true" />
    </>
  );
};

export default BottomNavbar;
