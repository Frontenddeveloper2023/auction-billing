import React, { useState, useEffect } from "react";
import { History as HistoryIcon, Calendar, PackageSearch, Search, Filter } from "lucide-react";
import LoadingSpinner from "../../components/Common/LoadingSpinner";
import SearchableSelect from "../../components/Common/SearchableSelect";
import VoiceSearch from "../../components/Common/VoiceSearch";
import BackButton from "../../components/Common/BackButton";
import {
  getMainVendorBranches,
  getMainVendorHistory,
} from "../../api/mainVendorApi";


function History() {
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [customDate, setCustomDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [branches, setBranches] = useState([
    { id: "all", name: "All Branches" },
  ]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    // Add a slight debounce for search term
    const timer = setTimeout(() => {
      fetchHistory();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedBranch, searchTerm, dateFilter, customDate]);

  const fetchBranches = async () => {
    try {
      const res = await getMainVendorBranches();
      if (res.status) {
        const branchList = res.vendors.map((v) => ({
          id: v._id,
          name: v.name,
        }));
        setBranches([{ id: "all", name: "All Branches" }, ...branchList]);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let startDate = null;
      let endDate = null;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const next = (d) => new Date(d.getTime() + 24 * 60 * 60 * 1000);

      switch (dateFilter) {
        case "today":
          startDate = today.toISOString().split("T")[0];
          endDate = next(today).toISOString().split("T")[0];
          break;
        case "yesterday":
          const y = new Date(today);
          y.setDate(y.getDate() - 1);
          startDate = y.toISOString().split("T")[0];
          endDate = today.toISOString().split("T")[0];
          break;
        case "week":
          const w = new Date(today);
          w.setDate(w.getDate() - 7);
          startDate = w.toISOString().split("T")[0];
          endDate = next(today).toISOString().split("T")[0];
          break;
        case "month":
          const m = new Date(today);
          m.setDate(1);
          startDate = m.toISOString().split("T")[0];
          endDate = next(today).toISOString().split("T")[0];
          break;
        case "year":
          startDate = new Date(today.getFullYear(), 0, 1)
            .toISOString()
            .split("T")[0];
          endDate = next(today).toISOString().split("T")[0];
          break;
        case "custom":
          const c = new Date(customDate);
          c.setHours(0, 0, 0, 0);
          startDate = c.toISOString().split("T")[0];
          endDate = next(c).toISOString().split("T")[0];
          break;
      }

      const params = {};
      if (selectedBranch !== "all") params.branchId = selectedBranch;
      if (searchTerm) params.searchTerm = searchTerm;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await getMainVendorHistory(params);
      console.log(res);
      
      if (res.status) {
        setHistory(res.transactions || res.history || []);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const branchOptions = branches.map((b) => ({ label: b.name, value: b.id }));

  return (
    <div className="history">
      <div className="content-header">
        <div className="header-top">
          <h1>Transaction History</h1>
          <BackButton />
        </div>
        <div className="breadcrumb">
          <span>Vendor</span>
          <span className="breadcrumb-separator">&gt;</span>
          <span>History</span>
        </div>
      </div>

      <div className="content-body">
        <div className="form-group" style={{ marginBottom: "1rem" }}>
          <label className="form-label">Select Branch</label>
          <SearchableSelect
            name="branch"
            options={branchOptions}
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            placeholder="All Branches"
          />
        </div>
        <div className="cr-filter-row" style={{ marginBottom: '1.5rem' }}>
          {/* Search */}
          <div className="cr-search-wrap" style={{ flex: 1 }}>
            <div className="search-input-wrapper" style={{ position: 'relative', flex: 1 }}>
              <Search size={15} className="cr-search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="cr-search-input"
                style={{ paddingLeft: '35px', paddingRight: '40px', width: '100%' }}
                placeholder="Search product, seller, buyer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}>
                <VoiceSearch onSearch={(text) => setSearchTerm(text)} minimal={true} />
              </div>
            </div>
          </div>

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

        {loading ? (
          <LoadingSpinner message="Fetching history..." />
        ) : (
          <div className="fade-in" style={{ padding: 0, overflow: "hidden" }}>
            <div className="mvh-table-wrapper">
              <table className="mvh-table">
                <thead className="bg-tertiary">
                  <tr>
                    <th className="mvh-th">Date</th>
                    <th className="mvh-th">Product</th>
                    <th className="mvh-th">Seller</th>
                    <th className="mvh-th">Buyer</th>
                    <th className="mvh-th mvh-num-col">Qty</th>
                    <th className="mvh-th mvh-num-col">Total</th>
                    <th className="mvh-th mvh-num-col">Comm.</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty-td">
                        <div className="empty-state">
                          <div className="empty-state-icon">
                            <PackageSearch />
                          </div>
                          <p>No history records found for the selected filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    history.map((t) => (
                      <tr key={t.id} className="mvh-tr">
                        <td className="mvh-td">
                          <span className="cr-date-badge">{t.date}</span>
                        </td>
                        <td className="mvh-td">
                          <div className="font-semibold text-primary">
                            {t.productName}
                          </div>
                          {t.branch && <small className="text-muted">{t.branch}</small>}
                        </td>
                        <td className="mvh-td">{t.sellerName}</td>
                        <td className="mvh-td">{t.buyerName}</td>
                        <td className="mvh-td mvh-num-col">
                          <span className="hs-qty-text">{t.quantity}</span>
                          {t.unit && <small className="text-muted ml-1">{t.unit}</small>}
                        </td>
                        <td className="mvh-td mvh-num-col">
                          <span className="font-bold">
                            ₹{((t.totalAmount !== undefined ? t.totalAmount : t.finalAmount) || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="mvh-td mvh-num-col">
                          <span className="text-amber">
                            ₹{(t.commissionAmount || 0).toLocaleString()}
                          </span>
                          {t.commissionPercent !== undefined && (
                            <div
                              style={{ fontSize: "0.7rem" }}
                              className="text-muted"
                            >
                              ({t.commissionPercent}%)
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* {!loading && history.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📜</div>
            <p>No history records found for the selected filters.</p>
          </div>
        )} */}
      </div>
    </div>
  );
}

export default History;
