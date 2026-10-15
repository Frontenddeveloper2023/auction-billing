import { useState, useEffect } from "react";
import { Search, Loader, Download, X } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "react-toastify";
import { formatDate } from "../../utils/dateUtils";
import { getMainVendorPurchases, exportMainVendorPurchases } from "../../api/adminApi";
import "./SaaSAdmin.css";
import VoiceSearch from "../../components/Common/VoiceSearch";

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportParams, setExportParams] = useState({
    startDate: null,
    endDate: null,
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 550);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 550);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        const response = await getMainVendorPurchases();
        if (response.status && response.purchases) {
          const vendorsData = response.purchases.map((purchase) => ({
            id: purchase.id,
            vendorName: purchase.vendorName || purchase.mainVendorName,
            plan: purchase.plan || "Unknown",
            price: purchase.price
              ? `₹${purchase.price.toLocaleString()}`
              : "₹0",
            paymentStatus: purchase.paymentStatus || "Paid",
            status: purchase.status,
            expiryDate: purchase.expiryDate,
            transactionId:
              purchase.transactionId ||
              `TXN_${purchase.id.slice(-6).toUpperCase()}`,
            startDate: purchase.startDate,
          }));
          setPurchases(vendorsData);
        }
      } catch (error) {
        console.error("Error fetching purchases:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPurchases();
  }, []);

  // Helper to check if date is nearing expiry (e.g., within 5 days)
  const isExpiringSoon = (dateString, status) => {
    if (
      status === "Inactive" ||
      status === "Expired" ||
      status === "Expiring Soon"
    )
      return false;

    // Simple logic for visual highlighting only, purely illustrative
    // In a real app, combine this with the 'status' field from DB
    const today = new Date();
    const expiry = new Date(dateString);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 && diffDays <= 5;
  };

  const getStatusBadge = (status, date) => {
    if (status === "Inactive" || status === "Expired") return "badge-danger";
    if (status === "Expiring Soon" || isExpiringSoon(date, status))
      return "badge-warning";
    return "badge-success";
  };

  const filteredPurchases = purchases.filter((purchase) => {
    const query = searchQuery.toLowerCase();
    return (
      purchase.vendorName.toLowerCase().includes(query) ||
      purchase.plan.toLowerCase().includes(query) ||
      purchase.transactionId.toLowerCase().includes(query) ||
      purchase.paymentStatus.toLowerCase().includes(query) ||
      purchase.status.toLowerCase().includes(query)
    );
  });

  const handleExportDownload = async () => {
    setExportLoading(true);
    try {
      const exportData = {
        from: exportParams.startDate,
        to: exportParams.endDate,
        search: searchQuery,
      };

      const response = await exportMainVendorPurchases(exportData);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `purchase_history_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      setIsExportModalOpen(false);
      toast.success("Purchase history exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Error exporting data. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="fade-in">
      {/* Export Modal */}
      {isExportModalOpen && (
        <div
          className="saas-modal-overlay"
          onClick={() => setIsExportModalOpen(false)}
        >
          <div
            className="saas-modal saas-export-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="saas-modal-header">
              <h3 className="saas-text-xl saas-font-semibold">
                Export Purchase History
              </h3>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="saas-modal-close-btn"
              >
                <X size={20} />
              </button>
            </div>
            <div className="saas-modal-content">
              <div className="mb-1 full-width">
                <label className="saas-label">Date Range (Purchase Date)</label>
                <DatePicker
                  selectsRange={true}
                  startDate={exportParams.startDate}
                  endDate={exportParams.endDate}
                  onChange={(update) => {
                    const [start, end] = update;
                    setExportParams((prev) => ({
                      ...prev,
                      startDate: start,
                      endDate: end,
                    }));
                  }}
                  isClearable={true}
                  placeholderText="Select range (From - To)"
                  className="saas-input"
                />
              </div>
            </div>
            <div className="saas-modal-footer">
              <button
                className="saas-btn btn-secondary"
                onClick={() => setIsExportModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="saas-btn btn-primary"
                onClick={handleExportDownload}
                disabled={exportLoading}
              >
                {exportLoading ? (
                  <>
                    <Loader className="saas-spinner" size={16} /> Exporting...
                  </>
                ) : (
                  "Download Excel"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="saas-card saas-mb-15 subAdminCard">
        <h2 className="saas-text-2xl saas-font-bold subAdminCardTitle">
          Vendor Purchase History
        </h2>
        <p className="saas-text-muted saas-text-sm saas-mb-15">
          View all vendor subscriptions and purchases
        </p>
        <div className="saas-flex-between subAdminTopControls">
          <div className="saasSearchWrapperWide">
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} className="saasSearchIconPosition" />
              <input
                type="text"
                className="saas-input saasSearchInputWide"
                placeholder="Search purchases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingRight: '40px' }}
              />
              <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
                <VoiceSearch onSearch={(text) => setSearchQuery(text)} minimal={true} />
              </div>
            </div>
          </div>
          <div className="saas-flex saas-gap-10px">
            <button
              className="saas-btn btn-outline"
              onClick={() => setIsExportModalOpen(true)}
            >
              <Download size={18} /> Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className={isMobile ? "subAdminTableCard" : "saas-card"}>
        <div className="saas-table-container">
          <table className="saas-table subAdminTable saas-desktop-only-480">
            <thead className="subAdminTableHeader">
              <tr>
                <th>Vendor Name</th>
                <th>Plan</th>
                <th>Price</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Purchase Date</th>
                <th>Expiry Date</th>
                <th>Transaction ID</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="8" className="saas-text-center saas-py-4">
                    <Loader
                      className="saas-spinner saas-inline-block"
                      size={24}
                    />{" "}
                    Loading purchases...
                  </td>
                </tr>
              ) : filteredPurchases.length > 0 ? (
                filteredPurchases.map((purchase) => {
                  const expiring = isExpiringSoon(
                    purchase.expiryDate,
                    purchase.status,
                  );

                  return (
                    <tr key={purchase.id}>
                      <td className="saas-font-medium">
                        {purchase.vendorName}
                      </td>
                      <td>
                        <span className="saas-font-semibold saas-text-primary">
                          {purchase.plan}
                        </span>
                      </td>
                      <td>{purchase.price}</td>
                      <td>
                        <span
                          className={`saas-badge ${purchase.paymentStatus === "Paid" ? "badge-success" : "badge-danger"}`}
                        >
                          {purchase.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`saas-badge ${getStatusBadge(purchase.status, purchase.expiryDate)}`}
                        >
                          {expiring && purchase.status === "Active"
                            ? "Expiring Soon"
                            : purchase.status}
                        </span>
                      </td>
                      <td>
                        <div className="saas-flex-col">
                          <span>
                            {purchase.startDate
                              ? formatDate(purchase.startDate)
                              : "--"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="saas-flex-col">
                          <span>
                            {purchase.expiryDate
                              ? formatDate(purchase.expiryDate)
                              : "N/A"}
                          </span>
                          {expiring && (
                            <span className="saas-expiry-warning">
                              ⚠️ Renew Soon
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="saas-transaction-id">
                        {purchase.transactionId}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="saas-text-center saas-py-4">
                    No purchases found matching "{searchQuery}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="saas-mobile-cards-view-480">
            {isLoading ? (
              <div className="saas-text-center saas-p-20">
                <Loader className="saas-spinner" size={24} /> Loading...
              </div>
            ) : filteredPurchases.length > 0 ? (
              filteredPurchases.map((purchase) => (
                <div key={purchase.id} className="saas-mobile-card">
                  <div className="saas-mobile-card-row">
                    <span className="saas-mobile-card-label">Vendor</span>
                    <span className="saas-mobile-card-value saas-font-bold">
                      {purchase.vendorName}
                    </span>
                  </div>
                  <div className="saas-mobile-card-row">
                    <span className="saas-mobile-card-label">Plan</span>
                    <span className="saas-mobile-card-value saas-font-semibold saas-text-primary">
                      {purchase.plan}
                    </span>
                  </div>
                  <div className="saas-mobile-card-row">
                    <span className="saas-mobile-card-label">Price</span>
                    <span className="saas-mobile-card-value">
                      {purchase.price}
                    </span>
                  </div>
                  <div className="saas-mobile-card-row">
                    <span className="saas-mobile-card-label">Payment</span>
                    <span className="saas-mobile-card-value">
                      <span
                        className={`saas-badge ${purchase.paymentStatus === "Paid" ? "badge-success" : "badge-danger"}`}
                      >
                        {purchase.paymentStatus}
                      </span>
                    </span>
                  </div>
                  <div className="saas-mobile-card-row">
                    <span className="saas-mobile-card-label">Date</span>
                    <span className="saas-mobile-card-value">
                      {purchase.startDate
                        ? formatDate(purchase.startDate)
                        : "--"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="saas-text-center saas-p-20 saas-text-muted">
                No purchases found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Purchases;
