import { useState, useEffect } from "react";
import { formatDate } from "../../utils/dateUtils";
import "./CommissionRecord.css";
import "../TodayAuction/TodayAuction.css";
import {
  BadgeIndianRupee,
  ArrowRightLeft,
  ChartNoAxesColumn,
  Search,
  Filter,
  Calendar,
  Save,
  Pencil,
  TrendingUp,
} from "lucide-react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import LoadingSpinner from "../Common/LoadingSpinner";
import BackButton from "../Common/BackButton";
import VoiceSearch from "../Common/VoiceSearch";
import {
  getCommission,
  updateCommission,
  getCommissionRecords,
} from "../../api/commissionApi";

function CommissionRecord() {
  const [commissions, setCommissions] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalCommission: 0,
    totalSales: 0,
    count: 0,
    avgCommission: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [globalCommission, setGlobalCommission] = useState("");
  const [isEditingCommission, setIsEditingCommission] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { vendorId } = useSelector((state) => state.vendorAuth);
  const currentVendorId = vendorId || sessionStorage.getItem("vendorId");

  const handleSaveCommission = async () => {
    if (!globalCommission && globalCommission !== 0) {
      toast.error("Please enter a commission value");
      return;
    }
    try {
      const res = await updateCommission(currentVendorId, globalCommission);
      if (res.success) {
        toast.success(
          `Global commission of ${globalCommission}% saved successfully!`,
        );
      }
    } catch (error) {
      toast.error(error.message || "Failed to save commission");
    }
  };

  const handleEditToggle = async () => {
    if (isEditingCommission) {
      // Save mode → call API then lock
      await handleSaveCommission();
      setIsEditingCommission(false);
    } else {
      // View mode → unlock for editing
      setIsEditingCommission(true);
    }
  };

  const fetchCommission = async () => {
    if (!currentVendorId) return;
    try {
      const res = await getCommission(currentVendorId);
      if (res.success) {
        setGlobalCommission(res.data || 0);
      }
    } catch (error) {
      console.error("Error fetching commission:", error);
    }
  };

  useEffect(() => {
    loadCommissions();
    fetchCommission();
  }, [currentVendorId, searchTerm, dateFilter, customDate]);

  const loadCommissions = async () => {
    if (!currentVendorId) return;
    setIsLoading(true);
    try {
      const params = {
        searchTerm,
        dateFilter,
        customDate,
      };
      const res = await getCommissionRecords(currentVendorId, params);
      if (res.success) {
        setCommissions(res.data || []);
        setSummaryStats(
          res.stats || {
            totalCommission: 0,
            totalSales: 0,
            count: 0,
            avgCommission: 0,
          },
        );
      }
    } catch (error) {
      console.error("Error loading commissions:", error);
      toast.error("Failed to load commission records");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="content-header">
        <div className="header-top">
          <h1>Commission</h1>
          <BackButton />
        </div>
        <div className="breadcrumb-row">
          <div className="breadcrumb">
            <span>Home</span>
            <span className="breadcrumb-separator">/</span>
            <span>Commission</span>
          </div>

          {/* Global Commission quick-set */}
          <div className="cr-global-bar">
            <span className="cr-global-label">Global&nbsp;Commission</span>
            <div className="cr-global-input-wrap">
              <input
                type="number"
                min="0"
                max="100"
                value={globalCommission}
                onChange={(e) => setGlobalCommission(e.target.value)}
                className={`cr-global-input${!isEditingCommission ? " cr-global-input--readonly" : ""}`}
                placeholder="0"
                readOnly={!isEditingCommission}
              />
              <span className="cr-percent-badge">%</span>
            </div>
            <button
              className={`btn btn-sm cr-save-btn${isEditingCommission ? " btn-primary" : " btn-outline-secondary cr-edit-btn"}`}
              onClick={handleEditToggle}
            >
              {isEditingCommission ? <Save size={14} /> : <Pencil size={14} />}
              {isEditingCommission ? "Save" : "Edit"}
            </button>
          </div>
        </div>
      </div>

      <div className="content-body">
        {/* ── Summary Stats ──────────────────────────────── */}
        <div className="stats-grid fade-in">
          <div className="stat-card cr-stat-card cr-stat-amber">
            <div className="stat-header">
              <div className="stat-icon cr-stat-icon-amber">
                <BadgeIndianRupee size={20} />
              </div>
              <div>
                <div className="stat-value">
                  ₹{(summaryStats.totalCommission)}
                </div>
                <div className="stat-label">Total Commission</div>
              </div>
            </div>
          </div>

          <div className="stat-card cr-stat-card cr-stat-blue">
            <div className="stat-header">
              <div className="stat-icon cr-stat-icon-blue">
                <ArrowRightLeft size={20} />
              </div>
              <div>
                <div className="stat-value">{summaryStats.count}</div>
                <div className="stat-label">no of commissions</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filters Card ───────────────────────────────── */}
        <div className="card fade-in cr-filter-card">
          <div className="cr-filter-row">
            {/* Search */}
            <div className="cr-search-wrap" style={{ flex: 1 }}>
              <div className="search-input-wrapper" style={{ position: 'relative', flex: 1 }}>
                <Search size={15} className="cr-search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  className="cr-search-input"
                  style={{ paddingLeft: '35px', paddingRight: '40px', width: '100%' }}
                  placeholder="Search product or seller…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
                  <VoiceSearch onSearch={(text) => setSearchTerm(text)} minimal={true} />
                </div>
              </div>
            </div>

            {/* Period filter */}
            <div className="cr-controls">
              <div className="cr-select-wrap">
                <Filter size={13} className="cr-select-icon" />
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="cr-select"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                  <option value="custom">📅 Custom Date</option>
                </select>
              </div>

              {dateFilter === "custom" && (
                <div className="cr-date-wrap fade-in">
                  <Calendar size={13} className="cr-date-icon" />
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="cr-date-input"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Commission Table ────────────────────────────── */}
        <div className="section-header cr-section-header">
          <h3 className="section-title">Commission Details</h3>
          <span className="cr-count-chip">{summaryStats.count} records</span>
        </div>

        <div className="fade-in">
          {isLoading ? (
            <LoadingSpinner message="Loading commission records..." />
          ) : commissions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💰</div>
              <p>No commission records found</p>
            </div>
          ) : (
            <div className="table-responsive bg-card rounded-lg shadow-sm custom-table-wrapper cr-table-wrapper">
              <table className="data-table custom-data-table commission-table">
                <thead className="bg-tertiary">
                  <tr>
                     <th className="custom-th">Date</th>
                    <th className="custom-th">Product</th>
                    <th className="custom-th">Seller</th>
                 
                    <th className="custom-th cr-num-col">Sale Amount</th>
                    <th className="custom-th cr-center-col">Comm&nbsp;%</th>
                    <th className="custom-th cr-num-col cr-highlight-col">
                      Earned
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((c, idx) => (
                    <tr
                      key={c.id}
                      className={`custom-tr ${idx % 2 === 0 ? "cr-row-even" : ""}`}
                    >
                      <td className="custom-td" data-label="Date">
                        <span className="cr-date-badge">
                          {formatDate(c.latestDate)}
                        </span>
                      </td>
                      <td className="custom-td" data-label="Product">
                        <span className="cr-product-name">{c.productName}</span>
                      </td>

                      <td className="custom-td" data-label="Seller">
                        <span className="cr-seller-name">{c.sellerName}</span>
                      </td>

                      <td className="custom-td cr-num-col" data-label="Sale Amount">
                        <span className="cr-sale-amount">
                          ₹{(c.totalSales || 0).toLocaleString()}
                        </span>
                      </td>

                      <td className="custom-td cr-center-col" data-label="Comm %">
                        <span className="badge badge-warning cr-pct-badge">
                          {c.commissionPercent}%
                        </span>
                      </td>

                      <td className="custom-td cr-num-col cr-highlight-col" data-label="Earned">
                        <span className="cr-earned">
                          ₹{(c.totalCommission || 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* ── Summary footer ── */}
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default CommissionRecord;
