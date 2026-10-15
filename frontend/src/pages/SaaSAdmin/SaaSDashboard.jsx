import { useState, useEffect } from "react";
import "./SaaSAdmin.css";
import { Link } from "react-router-dom";
import {
  Users,
  Crown,
  Banknote,
  Hourglass,
  Settings,
  Trash2,
  Loader,
} from "lucide-react";
import { getMainVendors, getMainVendorPurchases } from "../../api/adminApi";
import { formatDate } from "../../utils/dateUtils";

const SaaSDashboard = () => {
  const [stats, setStats] = useState({
    totalMainVendors: 0,
    activeSubscriptions: 0,
    monthlyRevenue: 0,
    pendingApprovals: 0,
  });

  const [recentVendors, setRecentVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        const [vendorsRes, purchasesRes] = await Promise.all([
          getMainVendors(),
          getMainVendorPurchases(),
        ]);

        let calculatedRevenue = 0;

        if (purchasesRes.status && purchasesRes.purchases) {
          const currentMonth = new Date().getMonth();
          const currentYear = new Date().getFullYear();

          calculatedRevenue = purchasesRes.purchases.reduce(
            (total, purchase) => {
              const purchaseDate = new Date(purchase.startDate || new Date());
              if (
                purchaseDate.getMonth() === currentMonth &&
                purchaseDate.getFullYear() === currentYear
              ) {
                return total + (Number(purchase.price) || 0);
              }
              return total;
            },
            0,
          );
        }

        if (vendorsRes.status) {
          const vendors = vendorsRes.vendors || vendorsRes.mainVendors || [];

          setStats((prev) => ({
            ...prev,
            totalMainVendors: vendors.length,
            pendingApprovals: vendors.filter((v) => v.status === "Pending")
              .length,
            activeSubscriptions: vendors.filter((v) => v.status === "Active")
              .length,
            monthlyRevenue: calculatedRevenue,
          }));

          const sortedVendors = [...vendors].sort((a, b) => {
            const dateA = new Date(a.joinedDate || a.createdAt);
            const dateB = new Date(b.joinedDate || b.createdAt);
            return dateB - dateA;
          });

          setRecentVendors(sortedVendors.slice(0, 5));
        }
      } catch (error) {
        console.error("Error fetching Dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="fade-in">
      <div className="saas-stats-grid">
        <Link to="/saas/vendors" className="saas-stat-card saas-no-decoration">
          <div className="saas-stat-header">
            <div className="saas-stat-icon icon-blue">
              <Users size={32} />
            </div>
          </div>

          <div className="saas-stat-value">{stats.totalMainVendors}</div>

          <div className="saas-stat-label">Total Vendors</div>
        </Link>

        <div className="saas-stat-card">
          <div className="saas-stat-header">
            <div className="saas-stat-icon icon-green">
              <Crown size={32} />
            </div>
          </div>
          <div className="saas-stat-value">{stats.activeSubscriptions}</div>
          <div className="saas-stat-label">Active Subscriptions</div>
        </div>

        <div className="saas-stat-card">
          <div className="saas-stat-header">
            <div className="saas-stat-icon icon-amber">
              <Banknote size={32} />
            </div>
          </div>
          <div className="saas-stat-value">
            ₹{stats.monthlyRevenue.toLocaleString()}
          </div>
          <div className="saas-stat-label">Monthly Revenue</div>
        </div>

        <div className="saas-stat-card">
          <div className="saas-stat-header">
            <div className="saas-stat-icon icon-rose">
              <Hourglass size={32} />
            </div>
          </div>
          <div className="saas-stat-value">{stats.pendingApprovals}</div>
          <div className="saas-stat-label">Pending Approvals</div>
        </div>
      </div>

      <div className="saas-card">
        <div className="saas-card-header">
          <h3 className="saas-text-lg saas-font-semibold">
            Recent Vendor Registrations
          </h3>
          <Link to="/saas/vendors">
            {" "}
            <button className="saas-btn btn-sm btn-outline">View All</button>
          </Link>
        </div>
        <div className="saas-table-container">
          <table className="saas-table saas-desktop-only">
            <thead>
              <tr>
                <th>Vendor Name</th>
                <th>Email</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Joined Date</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="saas-text-center saas-py-4">
                    <Loader
                      className="saas-spinner saas-inline-block"
                      size={24}
                    />{" "}
                    Loading recent vendors...
                  </td>
                </tr>
              ) : recentVendors.length === 0 ? (
                <tr>
                  <td colSpan="5" className="saas-text-center saas-py-4">
                    No recent registrations.
                  </td>
                </tr>
              ) : (
                recentVendors.map((vendor) => (
                  <tr key={vendor._id || vendor.id}>
                    <td className="saas-font-medium">{vendor.name}</td>
                    <td>{vendor.email}</td>
                    <td>
                      <span
                        className={`saas-badge ${(vendor.plan?.name || vendor.plan || "") === "Premium" ? "badge-info" : "badge-warning"}`}
                      >
                        {vendor.plan?.name || vendor.plan || "N/A"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`saas-badge ${vendor.status === "Active" ? "badge-success" : "badge-warning"}`}
                      >
                        {vendor.status}
                      </span>
                    </td>
                    <td>{formatDate(vendor.joinedDate || vendor.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="saas-mobile-cards-view">
            {loading ? (
              <div className="saas-text-center saas-p-20">
                <Loader className="saas-spinner saas-inline-block" size={24} />{" "}
                Loading...
              </div>
            ) : recentVendors.length === 0 ? (
              <div className="saas-text-center saas-p-20 saas-text-muted">
                No recent registrations.
              </div>
            ) : (
              recentVendors.map((vendor) => (
                <div key={vendor._id || vendor.id} className="saas-mobile-card">
                  <div className="saas-mobile-card-row">
                    <span className="saas-mobile-card-label">Name</span>
                    <span className="saas-mobile-card-value saas-font-bold">
                      {vendor.name}
                    </span>
                  </div>
                  <div className="saas-mobile-card-row">
                    <span className="saas-mobile-card-label">Email</span>
                    <span className="saas-mobile-card-value">
                      {vendor.email}
                    </span>
                  </div>
                  <div className="saas-mobile-card-row">
                    <span className="saas-mobile-card-label">Plan</span>
                    <span className="saas-mobile-card-value">
                      <span
                        className={`saas-badge ${(vendor.plan?.name || vendor.plan || "") === "Premium" ? "badge-info" : "badge-warning"}`}
                      >
                        {vendor.plan?.name || vendor.plan || "N/A"}
                      </span>
                    </span>
                  </div>
                  <div className="saas-mobile-card-row">
                    <span className="saas-mobile-card-label">Status</span>
                    <span className="saas-mobile-card-value">
                      <span
                        className={`saas-badge ${vendor.status === "Active" ? "badge-success" : "badge-warning"}`}
                      >
                        {vendor.status}
                      </span>
                    </span>
                  </div>
                  <div className="saas-mobile-card-row">
                    <span className="saas-mobile-card-label">Joined</span>
                    <span className="saas-mobile-card-value">
                      {formatDate(vendor.joinedDate || vendor.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaaSDashboard;
