import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  House,
  Building,
  UserCog,
  ShoppingCart,
  Handshake,
  History,
  PackagePlus,
  ChartSpline,
  PackageSearch,
  FileText,
  Gem,
  User,
  Filter,
  Calendar,
} from "lucide-react";
import { getMainVendorBranches } from "../../api/mainVendorApi";

// Reuse standard Dashboard styling for consistency
import "../../components/Dashboard/Dashboard.css";

function MainVendorDashboard() {
  const { vendorId, branchCount } = useSelector((state) => state.vendorAuth);
  const currentMainVendorId = vendorId || sessionStorage.getItem("vendorId");

  const [dateFilter, setDateFilter] = useState("today");
  const [customDate, setCustomDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [branches, setBranches] = useState([
    { id: "all", name: "All Branches" },
    { id: currentMainVendorId, name: "My Details" },
  ]);
  const [selectedBranch, setSelectedBranch] = useState(
    branchCount > 0 ? "all" : currentMainVendorId
  );

  useEffect(() => {
    fetchBranches();
  }, [currentMainVendorId]);

  const fetchBranches = async () => {
    try {
      const res = await getMainVendorBranches();
      if (res.status) {
        const branchList = res.vendors.map((v) => ({
          id: v._id,
          name: v.name,
        }));
        setBranches([
          { id: "all", name: "All Branches" },
          { id: currentMainVendorId, name: "My Details" },
          ...branchList,
        ]);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const managementItems = [
    ...(branchCount > 0
      ? [
          {
            title: "Branches",
            icon: Building,
            path: "/mainvendor/branches",
            theme: "menu-theme-purple",
          },
          {
            title: "Sellers",
            icon: UserCog,
            path: "/mainvendor/sellers",
            theme: "menu-theme-blue",
          },
          {
            title: "Buyers",
            icon: ShoppingCart,
            path: "/mainvendor/buyers",
            theme: "menu-theme-teal",
          },
          {
            title: "Commission",
            icon: Handshake,
            path: "/mainvendor/commission",
            theme: "menu-theme-pink",
          },
          {
            title: "History",
            icon: History,
            path: "/mainvendor/main-history",
            theme: "menu-theme-orange",
          },
        ]
      : []),
  ];

  const operationsItems = [
    {
      title: "Product List",
      icon: PackagePlus,
      path: "/mainvendor/add-product",
      theme: "menu-theme-blue",
    },
    {
      title: "Today Auction",
      icon: ChartSpline,
      path: "/mainvendor/today-auction",
      theme: "menu-theme-purple",
    },
    {
      title: "Pending Products",
      icon: PackageSearch,
      path: "/mainvendor/pending-products",
      theme: "menu-theme-green",
    },
    {
      title: "Billing & Invoices",
      icon: FileText,
      path: "/mainvendor/billing",
      theme: "menu-theme-red",
    },
    {
      title: "My Sellers",
      icon: UserCog,
      path: "/mainvendor/seller-details",
      theme: "menu-theme-blue",
    },
    {
      title: "My Buyers",
      icon: ShoppingCart,
      path: "/mainvendor/buyer-details",
      theme: "menu-theme-green",
    },
    {
      title: "My Commission",
      icon: Handshake,
      path: "/mainvendor/commission-record",
      theme: "menu-theme-pink",
    },
    {
      title: "My History",
      icon: History,
      path: "/mainvendor/history",
      theme: "menu-theme-orange",
    },
  ];

  const accountItems = [
    {
      title: "Subscription",
      icon: Gem,
      path: "/mainvendor/subscription",
      theme: "menu-theme-violet",
    },
    {
      title: "Profile",
      icon: User,
      path: "/mainvendor/manage",
      theme: "menu-theme-sky",
    },
  ];

  return (
    <>
      <div className="content-header">
        <div className="header-top dashboard-header-center">
          <h1>Vendor Dashboard</h1>
        </div>
      </div>

      <div className="content-body">
        <div className="dashboard-menu-container fade-in">
          {/* Management Section */}
          {managementItems.length > 0 && (
            <div className="dashboard-menu-section">
              <h3 className="dashboard-menu-heading">Management</h3>
              <div className="dashboard-menu-grid">
                {managementItems.map((item) => {
                  const IconComponent = item.icon;
                  return (
                    <Link
                      key={item.title}
                      to={item.path}
                      className={`dashboard-menu-card ${item.theme}`}
                    >
                      <div className="dashboard-menu-icon-box">
                        <IconComponent size={20} strokeWidth={2.1} />
                      </div>
                      <span className="dashboard-menu-label">{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* My Operations Section */}
          <div className="dashboard-menu-section">
            <h3 className="dashboard-menu-heading">My Branch</h3>
            <div className="dashboard-menu-grid">
              {operationsItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.title}
                    to={item.path}
                    className={`dashboard-menu-card ${item.theme}`}
                  >
                    <div className="dashboard-menu-icon-box">
                      <IconComponent size={20} strokeWidth={2.1} />
                    </div>
                    <span className="dashboard-menu-label">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Account Section */}
          <div className="dashboard-menu-section">
            <h3 className="dashboard-menu-heading">Account</h3>
            <div className="dashboard-menu-grid">
              {accountItems.map((item) => {
                const IconComponent = item.icon;
                return (
                  <Link
                    key={item.title}
                    to={item.path}
                    className={`dashboard-menu-card ${item.theme}`}
                  >
                    <div className="dashboard-menu-icon-box">
                      <IconComponent size={20} strokeWidth={2.1} />
                    </div>
                    <span className="dashboard-menu-label">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default MainVendorDashboard;