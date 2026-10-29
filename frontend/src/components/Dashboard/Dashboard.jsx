import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  House,
  PackagePlus,
  ChartSpline,
  PackageSearch,
  History,
  UserCog,
  ShoppingCart,
  Handshake,
  FileText,
  KeyRound,
  Filter,
  Calendar,
} from "lucide-react";
import "./Dashboard.css";

function Dashboard() {
  const [dateFilter, setDateFilter] = useState("today");
  const [customDate, setCustomDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const managementItems = [];

  const operationsItems = [
    {
      title: "Product List",
      icon: PackagePlus,
      path: "/vendor/add-product",
      theme: "menu-theme-blue",
    },
    {
      title: "Today Auction",
      icon: ChartSpline,
      path: "/vendor/today-auction",
      theme: "menu-theme-purple",
    },
    {
      title: "Pending Products",
      icon: PackageSearch,
      path: "/vendor/pending-products",
      theme: "menu-theme-green",
    },
    {
      title: "Billing & Invoices",
      icon: FileText,
      path: "/vendor/billing",
      theme: "menu-theme-red",
    },
    {
      title: "Seller Details",
      icon: UserCog,
      path: "/vendor/seller-details",
      theme: "menu-theme-blue",
    },
    {
      title: "Buyer Details",
      icon: ShoppingCart,
      path: "/vendor/buyer-details",
      theme: "menu-theme-green",
    },
    {
      title: "Commission Record",
      icon: Handshake,
      path: "/vendor/commission",
      theme: "menu-theme-pink",
    },
    {
      title: "History",
      icon: History,
      path: "/vendor/history",
      theme: "menu-theme-orange",
    },
  ];

  return (
    <>
      <div className="content-header">
        <div className="header-top">
          <h1>Branch Dashboard</h1>
          <div className="header-actions">
            <div className="dashboard-filter-container">
              <div className="filter-dropdown-wrapper">
                <Filter className="filter-icon" size={16} />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="dashboard-filter-select"
                >
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="custom">Custom Date</option>
                </select>
              </div>

              {dateFilter === "custom" && (
                <div className="custom-date-wrapper fade-in">
                  <Calendar className="calendar-icon" size={16} />
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="dashboard-date-input"
                  />
                </div>
              )}
            </div>
          </div>
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
        </div>
      </div>
    </>
  );
};

export default Dashboard;
