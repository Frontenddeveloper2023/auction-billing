import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { getTransactions, getAuctionHistory } from "../../api/auctionApi";
import { formatDate } from "../../utils/dateUtils";
import "./History.css";
import {
  ArrowRightLeft,
  Download,
  ShoppingCart,
  HandCoins,
  Search,
  Filter,
  Calendar,
  PackageSearch,
} from "lucide-react";
import LoadingSpinner from "../Common/LoadingSpinner";
import BackButton from "../Common/BackButton";
import VoiceSearch from "../Common/VoiceSearch";

function History() {
  const { vendorId } = useSelector((state) => state.vendorAuth);
  const fallbackVendorId = sessionStorage.getItem("vendorId");
  const currentVendorId = vendorId || fallbackVendorId;

  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customDate, setCustomDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    transactions: 0,
    sales: 0,
    commission: 0,
  });

  useEffect(() => {
    if (currentVendorId) {
      loadTransactions();
    }
  }, [currentVendorId]);

  useEffect(() => {
    filterTransactions();
  }, [searchTerm, dateFilter, transactions]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const response = await getAuctionHistory(currentVendorId);
      if (response && response.success) {
        const rawData = response.data || response.history || [];
        const enriched = rawData.map((t) => ({
          ...t,
          date: t.date || t.Date,
          productName:
            t.productName ||
            t.Product ||
            t.productId?.name ||
            "Unknown Product",
          sellerName:
            t.sellerName || t.Seller || t.sellerId?.name || "Unknown Seller",
          buyerName:
            t.buyerName || t.Buyer || t.buyerId?.name || "Unknown Buyer",
          quantity: t.quantity || t.Qty || 0,
          finalAmount: t.finalAmount || t.Total || 0,
          commissionAmount: t.commissionAmount || t.Comm || t["Comm."] || 0,
          netAmount: t.netAmount || t.Net || 0,
          unit: t.unit || t.variantId?.unit || "qty",
        }));

        setTransactions(
          enriched.sort((a, b) => new Date(b.date) - new Date(a.date)),
        );

        // Update summary with backend-calculated stats
        if (response.cardStatus) {
          setSummary(response.cardStatus);
        } else if (response.stats) {
          setSummary({
            transactions: response.stats.totalTransactions || 0,
            sales: response.stats.totalSales || 0,
            commission: response.stats.totalCommission || 0,
          });
        }
      }
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDateRange = (filter) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const next = (d) => new Date(d.getTime() + 24 * 60 * 60 * 1000);

    switch (filter) {
      case "today":
        return { start: today, end: next(today) };

      case "yesterday":
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        return { start: y, end: today };

      case "week":
        const w = new Date(today);
        w.setDate(w.getDate() - 7);
        return { start: w, end: next(today) };

      case "month":
        const m = new Date(today);
        m.setDate(1);
        return { start: m, end: next(today) };

      case "year":
        return { start: new Date(today.getFullYear(), 0, 1), end: next(today) };

      case "custom":
        const c = new Date(customDate);
        c.setHours(0, 0, 0, 0);
        return { start: c, end: next(c) };

      default:
        return null;
    }
  };

  const filterTransactions = () => {
    let filtered = [...transactions];

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          (t.productName || "").toLowerCase().includes(query) ||
          (t.sellerName || "").toLowerCase().includes(query) ||
          (t.buyerName || "").toLowerCase().includes(query),
      );
    }

    if (dateFilter !== "all") {
      const range = getDateRange(dateFilter);

      if (range) {
        filtered = filtered.filter((t) => {
          const d = new Date(t.date);
          return d >= range.start && d < range.end;
        });
      }
    }

    setFilteredTransactions(filtered);
  };

  if (loading) {
    return (
      <>
        <div className="content-header">
          <div className="header-top">
            <h1>History</h1>
            <BackButton />
          </div>
        </div>
        <div className="content-body">
          <LoadingSpinner message="Loading History..." />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="content-header">
        <div className="header-top">
          <h1>History</h1>
          <BackButton />
        </div>
        <div className="breadcrumb">
          <span>Home</span>
          <span className="breadcrumb-separator">/</span>
          <span>History</span>
        </div>
      </div>

      <div className="content-body">
        {/* Summary Cards */}
        <div className="stats-grid fade-in">
          <div className="stat-card hs-stat-card hs-stat-blue">
            <div className="stat-header">
              <div className="stat-icon hs-stat-icon-blue">
                <ArrowRightLeft size={20} />
              </div>
              <div>
                <div className="stat-value">{summary.transactions}</div>
                <div className="stat-label">Transactions</div>
              </div>
            </div>
          </div>

          <div className="stat-card hs-stat-card hs-stat-green">
            <div className="stat-header">
              <div className="stat-icon hs-stat-icon-green">
                <ShoppingCart size={20} />
              </div>
              <div>
                <div className="stat-value">₹{summary.sales}</div>
                <div className="stat-label">Total Sales</div>
              </div>
            </div>
          </div>

          <div className="stat-card hs-stat-card hs-stat-amber">
            <div className="stat-header">
              <div className="stat-icon hs-stat-icon-amber">
                <HandCoins size={20} />
              </div>
              <div>
                <div className="stat-value">₹{summary.commission}</div>
                <div className="stat-label">Commission</div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
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
                  placeholder="Search product, seller, buyer…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
                  <VoiceSearch onSearch={(text) => setSearchTerm(text)} minimal={true} />
                </div>
              </div>
            </div>

            {/* Filter controls */}
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

        {/* Transaction Table */}
        <div className="section-header section-header-margin">
          <h3 className="section-title">
            Recordings ({filteredTransactions.length})
          </h3>
        </div>

        <div className="fade-in" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-responsive">
            <table className="data-table hs-data-table hs-table">
              <thead className="bg-tertiary">
                <tr>
                  <th className="hs-th">Date</th>
                  <th className="hs-th">Product</th>
                  <th className="hs-th">Seller</th>
                  <th className="hs-th">Buyer</th>
                  <th className="hs-th hs-num-col">Qty</th>
                  <th className="hs-th hs-num-col">Total</th>
                  <th className="hs-th hs-num-col">Comm.</th>
                  {/* <th className="hs-th hs-num-col">Net</th> */}
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-td">
                      <div className="empty-state">
                        <div className="empty-state-icon">
                          <PackageSearch />
                        </div>
                        <p>No transactions found matching your criteria</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((t) => (
                    <tr key={t._id || t.id} className="hs-tr">
                      <td className="hs-td" data-label="Date">
                        <span className="cr-date-badge">
                          {formatDate(t.date)}
                        </span>
                      </td>
                      <td className="hs-td" data-label="Product">
                        <div className="font-semibold text-primary">
                          {t.productName}
                        </div>
                      </td>
                      <td className="hs-td" data-label="Seller">{t.sellerName}</td>
                      <td className="hs-td" data-label="Buyer">{t.buyerName}</td>
                      <td className="hs-td hs-num-col" data-label="Qty">
                        <span className="hs-qty-text">{t.quantity}</span>
                        <small className="text-muted ml-1">{t.unit}</small>
                      </td>
                      <td className="hs-td hs-num-col" data-label="Total">
                        <span className="font-bold">
                          ₹{t.finalAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="hs-td hs-num-col" data-label="Comm.">
                        <span className="text-amber">
                          ₹{t.commissionAmount.toLocaleString()}
                        </span>
                        <div
                          style={{ fontSize: "0.7rem" }}
                          className="text-muted"
                        >
                          ({t.commissionPercent}%)
                        </div>
                      </td>
                      {/* <td className="hs-td hs-num-col">
                        <span className="text-success font-bold">
                          ₹{t.netAmount.toLocaleString()}
                        </span>
                      </td> */}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default History;
