import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  CalendarPlus,
  Search,
  AlertCircle,
  X,
  Phone,
  Mail,
  Zap,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Clock,
  Calendar as CalendarIcon,
} from "lucide-react";
import { getMainVendors, extendVendorPlanApi } from "../../api/adminApi";
import { toast } from "react-toastify";
import LoadingSpinner from "../../components/Common/LoadingSpinner";
import "./SaaSAdmin.css";

const PlanExtension = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [customDaysFilter, setCustomDaysFilter] = useState("");

  // Pagination (Strictly 5 users per page)
  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 5;

  // Responsive screen detection for dynamic placeholders
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Modal State
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Modal Fields (Bi-directional sync between Days and Calendar)
  const [extendDays, setExtendDays] = useState("7");
  const [expiryDate, setExpiryDate] = useState("");
  const [timeHour, setTimeHour] = useState("11");
  const [timeMinute, setTimeMinute] = useState("59");
  const [timePeriod, setTimePeriod] = useState("PM");

  // Draggable table ref and state for smooth mouse & touch drag-to-swipe
  const tableContainerRef = useRef(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const dragInfo = useRef({
    isDown: false,
    startX: 0,
    scrollLeft: 0,
    hasMoved: false,
  });

  const handleMouseDown = (e) => {
    // Only drag with left mouse button
    if (e.button !== 0) return;
    const container = tableContainerRef.current;
    if (!container) return;

    dragInfo.current.isDown = true;
    dragInfo.current.startX = e.pageX - container.offsetLeft;
    dragInfo.current.scrollLeft = container.scrollLeft;
    dragInfo.current.hasMoved = false;
    setIsMouseDown(true);
  };

  const handleMouseLeave = () => {
    if (dragInfo.current.isDown) {
      dragInfo.current.isDown = false;
      setIsMouseDown(false);
    }
  };

  const handleMouseUp = () => {
    if (dragInfo.current.isDown) {
      dragInfo.current.isDown = false;
      setIsMouseDown(false);
      // Small timeout to prevent triggering row click immediately after dragging
      setTimeout(() => {
        dragInfo.current.hasMoved = false;
      }, 50);
    }
  };

  const handleMouseMove = (e) => {
    if (!dragInfo.current.isDown) return;
    const container = tableContainerRef.current;
    if (!container) return;

    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - dragInfo.current.startX) * 1.5; // Smooth 1.5x multiplier for responsive tight swipe
    if (Math.abs(walk) > 4) {
      dragInfo.current.hasMoved = true;
    }
    container.scrollLeft = dragInfo.current.scrollLeft - walk;
  };

  // Touch Handlers for mobile / small screen drag-to-swipe
  const handleTouchStart = (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    const container = tableContainerRef.current;
    if (!container) return;

    dragInfo.current.isDown = true;
    dragInfo.current.startX = e.touches[0].pageX - container.offsetLeft;
    dragInfo.current.scrollLeft = container.scrollLeft;
    dragInfo.current.hasMoved = false;
    setIsMouseDown(true);
  };

  const handleTouchMove = (e) => {
    if (!dragInfo.current.isDown || !e.touches || e.touches.length !== 1) return;
    const container = tableContainerRef.current;
    if (!container) return;

    const x = e.touches[0].pageX - container.offsetLeft;
    const walk = (x - dragInfo.current.startX) * 1.5;
    if (Math.abs(walk) > 4) {
      dragInfo.current.hasMoved = true;
    }
    container.scrollLeft = dragInfo.current.scrollLeft - walk;
  };

  const handleTouchEnd = () => {
    if (dragInfo.current.isDown) {
      dragInfo.current.isDown = false;
      setIsMouseDown(false);
      setTimeout(() => {
        dragInfo.current.hasMoved = false;
      }, 70);
    }
  };

  const fetchVendorsList = async () => {
    try {
      setLoading(true);
      const res = await getMainVendors();
      if (res.status && Array.isArray(res.mainVendors)) {
        setVendors(res.mainVendors);
      }
    } catch (err) {
      console.error("Error fetching vendors:", err);
      toast.error(err.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorsList();
  }, []);

  // Format Date and Time in Indian Standard 12-hour AM/PM
  const formatIndianDateTime = (dateVal) => {
    if (!dateVal) return "N/A";
    try {
      const dt = new Date(dateVal);
      if (isNaN(dt.getTime())) return "N/A";

      return dt.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return String(dateVal);
    }
  };

  // Helper to format Date only (DD/MM/YYYY)
  const formatIndianDate = (dateVal) => {
    if (!dateVal) return "N/A";
    try {
      const dt = new Date(dateVal);
      if (isNaN(dt.getTime())) return "N/A";
      return dt.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return String(dateVal);
    }
  };

  // Calculate days remaining helper
  const getDaysRemaining = (vendor) => {
    const expiryDateVal = vendor.planEndDate || vendor.activeSubscription?.endDate;
    if (!expiryDateVal) return null;
    const now = new Date();
    const expiry = new Date(expiryDateVal);
    const diffMs = expiry - now;
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  // Base starting date for calculation
  const getBaseDate = (vendor) => {
    const now = new Date();
    const currentExpiry = vendor?.planEndDate ? new Date(vendor.planEndDate) : now;
    return currentExpiry > now ? new Date(currentExpiry) : new Date(now);
  };

  // Filtered vendor list
  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      // 1. Text Search (name, email, phone)
      const term = searchTerm.trim().toLowerCase();
      if (term) {
        const nameMatch = v.name?.toLowerCase().includes(term);
        const emailMatch = v.email?.toLowerCase().includes(term);
        const phoneMatch = v.phone?.includes(term);
        if (!nameMatch && !emailMatch && !phoneMatch) return false;
      }

      // 2. Custom Expiring Days Filter
      if (customDaysFilter !== "" && !isNaN(Number(customDaysFilter))) {
        const threshold = Number(customDaysFilter);
        const days = getDaysRemaining(v);
        if (threshold >= 0) {
          if (days === null || days > threshold || days < 0) return false;
        }
      }

      return true;
    });
  }, [vendors, searchTerm, customDaysFilter]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, customDaysFilter]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredVendors.length / USERS_PER_PAGE) || 1;
  const paginatedVendors = useMemo(() => {
    const startIdx = (currentPage - 1) * USERS_PER_PAGE;
    return filteredVendors.slice(startIdx, startIdx + USERS_PER_PAGE);
  }, [filteredVendors, currentPage]);

  // Open Modal: initialize fields
  const handleOpenExtendModal = (vendor) => {
    setSelectedVendor(vendor);

    // Initial: 7 days extension
    const base = getBaseDate(vendor);
    const future = new Date(base);
    future.setDate(future.getDate() + 7);

    const yyyy = future.getFullYear();
    const mm = String(future.getMonth() + 1).padStart(2, "0");
    const dd = String(future.getDate()).padStart(2, "0");

    setExtendDays("7");
    setExpiryDate(`${yyyy}-${mm}-${dd}`);
    setTimeHour("11");
    setTimeMinute("59");
    setTimePeriod("PM");
    setIsModalOpen(true);
  };

  // 1. When user enters manual days -> dynamically update the calendar date
  const handleDaysChange = (daysVal) => {
    setExtendDays(daysVal);
    const num = Number(daysVal);
    if (!isNaN(num) && num > 0 && selectedVendor) {
      const base = getBaseDate(selectedVendor);
      base.setDate(base.getDate() + num);

      const yyyy = base.getFullYear();
      const mm = String(base.getMonth() + 1).padStart(2, "0");
      const dd = String(base.getDate()).padStart(2, "0");
      setExpiryDate(`${yyyy}-${mm}-${dd}`);
    }
  };

  // 2. When user picks date from calendar -> dynamically calculate and update days
  const handleCalendarDateChange = (dateVal) => {
    setExpiryDate(dateVal);
    if (dateVal && selectedVendor) {
      const [year, month, day] = dateVal.split("-").map(Number);
      const chosenDate = new Date(year, month - 1, day);
      const base = getBaseDate(selectedVendor);

      // Reset to midnight for clean day calculation
      const baseMidnight = new Date(base.getFullYear(), base.getMonth(), base.getDate());
      const chosenMidnight = new Date(chosenDate.getFullYear(), chosenDate.getMonth(), chosenDate.getDate());

      const diffTime = chosenMidnight - baseMidnight;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      setExtendDays(diffDays > 0 ? String(diffDays) : "0");
    }
  };

  // Live calculated final expiry DateTime object
  const calculatedFinalExpiry = useMemo(() => {
    if (!selectedVendor || !expiryDate) return null;
    const [year, month, day] = expiryDate.split("-").map(Number);
    const resultDate = new Date(year, month - 1, day);

    let hours = Number(timeHour) % 12;
    if (timePeriod === "PM") hours += 12;
    const minutes = Number(timeMinute) || 0;

    resultDate.setHours(hours, minutes, 0, 0);
    return resultDate;
  }, [selectedVendor, expiryDate, timeHour, timeMinute, timePeriod]);

  // Submit Extension
  const handleSubmitExtension = async (e) => {
    e.preventDefault();
    if (!selectedVendor || !calculatedFinalExpiry) return;

    try {
      setSubmitting(true);
      const res = await extendVendorPlanApi({
        vendorId: selectedVendor._id,
        targetDateTime: calculatedFinalExpiry.toISOString(),
      });

      if (res.status) {
        toast.success(res.message || "Plan extended successfully!");
        setIsModalOpen(false);
        setSelectedVendor(null);
        await fetchVendorsList();
      } else {
        toast.error(res.message || "Failed to extend plan");
      }
    } catch (err) {
      console.error("Plan extension submit error:", err);
      toast.error(err.message || "Error extending plan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="saas-plan-ext-page" style={{ padding: "1.2rem 1.5rem" }}>
      {/* Page Header */}
      <div className="saas-page-header" style={{ marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
      <div>
        <h1 className="saas-page-title" style={{ fontSize: "1.6rem", fontWeight: "700", color: "#0f172a", margin: 0 }}>
          Plan Extension
        </h1>

      </div>

    </div>

      {/* Simplified Filter Bar */ }
  <div className="card" style={{ padding: "1rem 1.25rem", marginBottom: "1.25rem", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", alignItems: "center" }}>

      {/* Search by Name, Email, or Phone */}
      <div style={{ position: "relative" }}>
        <input
          type="text"
          className="form-control"
          style={{ paddingLeft: "36px", height: "40px" }}
          placeholder={isMobile ? "Search vendor..." : "Search by Name, Email, or Phone..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Custom Expiring Days Filter */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          type="number"
          min="0"
          className="form-control"
          style={{ height: "40px" }}
          placeholder={isMobile ? "Expiring in days (e.g. 7)..." : "Filter expiring in days (e.g. 3, 7, 30)..."}
          value={customDaysFilter}
          onChange={(e) => setCustomDaysFilter(e.target.value)}
        />
        {customDaysFilter && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => setCustomDaysFilter("")}
            style={{ height: "40px", padding: "0 12px" }}
            title="Clear Filter"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  </div>

  {/* Vendors Table */ }
  <div className="card" style={{ padding: 0, overflow: "hidden", borderRadius: "10px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
    {loading ? (
      <div style={{ padding: "3rem" }}>
        <LoadingSpinner message="Loading vendors..." />
      </div>
    ) : filteredVendors.length === 0 ? (
      <div style={{ padding: "3.5rem 1rem", textAlign: "center", color: "#64748b" }}>
        <AlertCircle size={38} style={{ margin: "0 auto 10px", color: "#94a3b8" }} />
        <h3 style={{ fontSize: "1.1rem", color: "#1e293b" }}>No Vendors Found</h3>
        <p style={{ fontSize: "0.85rem" }}>Try clearing search or entering different expiring days.</p>
      </div>
    ) : (
      <>
        <div
          ref={tableContainerRef}
          className={`table-responsive table-draggable-container ${isMouseDown ? "is-dragging" : ""}`}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          style={{
            touchAction: "pan-x pan-y",
          }}
        >
          <table className="custom-table plan-ext-table">
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "0.85rem 1.1rem" }}>Vendor Details</th>
                <th style={{ padding: "0.85rem 1.1rem" }}>Current Plan</th>
                <th style={{ padding: "0.85rem 1.1rem" }}>Current Expiry (IST)</th>
                <th style={{ padding: "0.85rem 1.1rem" }}>Days Remaining</th>
                <th style={{ padding: "0.85rem 1.1rem", textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedVendors.map((v) => {
                const daysLeft = getDaysRemaining(v);
                const isExpired = daysLeft !== null && daysLeft <= 0;
                const isExpiringSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 7;
                const planName = v.plan?.name || v.planName || "Active Plan";
                const expiryDisplay = formatIndianDateTime(v.planEndDate || v.activeSubscription?.endDate);

                return (
                  <tr
                    key={v._id}
                    onClick={() => {
                      if (dragInfo.current.hasMoved) return;
                      handleOpenExtendModal(v);
                    }}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      cursor: "pointer",
                      transition: "background-color 0.15s ease",
                    }}
                    className="plan-ext-row"
                    title="Click anywhere on row to extend plan"
                  >
                    {/* Vendor Details */}
                    <td className="plan-ext-vendor-cell" style={{ padding: "0.85rem 1.1rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                        <span className="plan-ext-vendor-name">
                          {v.name}
                        </span>
                        <span className="plan-ext-vendor-info">
                          <Mail size={12} style={{ flexShrink: 0, marginTop: "2px" }} />
                          <span>{v.email}</span>
                        </span>
                        {v.phone && (
                          <span className="plan-ext-vendor-info">
                            <Phone size={12} style={{ flexShrink: 0, marginTop: "2px" }} />
                            <span>{v.phone}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Plan */}
                    <td style={{ padding: "0.85rem 1.1rem" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "0.25rem 0.65rem", borderRadius: "8px", background: "#f1f5f9", fontSize: "0.82rem", fontWeight: "600", color: "#334155" }}>
                        <Zap size={13} style={{ color: "#f59e0b" }} />
                        {planName}
                      </span>
                    </td>

                    {/* Current Expiry */}
                    <td style={{ padding: "0.85rem 1.1rem" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                        <span style={{ fontWeight: "600", color: "#1e293b", fontSize: "0.86rem" }}>
                          {expiryDisplay}
                        </span>
                      </div>
                    </td>

                    {/* Days Remaining */}
                    <td style={{ padding: "0.85rem 1.1rem" }}>
                      {daysLeft === null ? (
                        <span style={{ color: "#94a3b8", fontSize: "0.82rem" }}>N/A</span>
                      ) : isExpired ? (
                        <span style={{ color: "#dc2626", fontWeight: "700", fontSize: "0.84rem" }}>
                          Expired ({Math.abs(daysLeft)}d ago)
                        </span>
                      ) : (
                        <span style={{ color: isExpiringSoon ? "#d97706" : "#059669", fontWeight: "700", fontSize: "0.84rem" }}>
                          {daysLeft} Day{daysLeft !== 1 ? "s" : ""} left
                        </span>
                      )}
                    </td>

                    {/* Action Button */}
                    <td style={{ padding: "0.85rem 1.1rem", textAlign: "right" }}>
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{
                          padding: "0.45rem 0.95rem",
                          fontSize: "0.82rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          whiteSpace: "nowrap",
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenExtendModal(v);
                        }}
                      >
                        <CalendarPlus size={15} />
                        <span>Extend Plan</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls (5 per page) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 1.25rem", borderTop: "1px solid #e2e8f0", background: "#f8fafc", flexWrap: "wrap", gap: "0.75rem" }}>
        <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
          Showing <strong>{Math.min((currentPage - 1) * USERS_PER_PAGE + 1, filteredVendors.length)}</strong> to{" "}
          <strong>{Math.min(currentPage * USERS_PER_PAGE, filteredVendors.length)}</strong> of{" "}
          <strong>{filteredVendors.length}</strong> vendors
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: "0.35rem 0.65rem", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={15} />
            <span>Prev</span>
          </button>

          <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "#334155", padding: "0 6px" }}>
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: "0.35rem 0.65rem", fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage >= totalPages}
          >
            <span>Next</span>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
  </>
        )}
      </div >

  {/* ── User-Friendly Extend Plan Modal ──────────────────────── */ }
{
  isModalOpen && selectedVendor && (
    <div className="custom-modal-backdrop" onClick={() => !submitting && setIsModalOpen(false)}>
      <div
        className="custom-modal-content"
        style={{ maxWidth: "500px", width: "95%", borderRadius: "12px", padding: "1.4rem" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ background: "#ecfdf5", padding: "7px", borderRadius: "8px", color: "#059669" }}>
            <CalendarPlus size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#0f172a" }}>Extend Plan</h3>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
              Vendor: <strong>{selectedVendor.name}</strong>
            </p>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-outline"
          style={{ padding: "4px", borderRadius: "50%" }}
          onClick={() => !submitting && setIsModalOpen(false)}
        >
          <X size={17} />
        </button>
      </div>

      <form onSubmit={handleSubmitExtension}>
        {/* Current Expiry Info */}
        <div style={{ background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1.1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <span style={{ fontSize: "0.76rem", color: "#64748b", display: "block" }}>Current Expiry Date &amp; Time</span>
          <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#0f172a" }}>
            {formatIndianDateTime(selectedVendor.planEndDate || selectedVendor.activeSubscription?.endDate)}
          </span>
        </div>
        <span style={{ padding: "0.2rem 0.55rem", borderRadius: "6px", background: "#f1f5f9", fontSize: "0.76rem", fontWeight: "600", color: "#475569" }}>
          {selectedVendor.plan?.name || "Active Plan"}
        </span>
    </div>

              {/* Field 1: Enter Manual Days (Synced with Calendar) */ }
  <div className="form-group" style={{ marginBottom: "1rem" }}>
    <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "#1e293b", marginBottom: "5px", display: "block" }}>
      Enter Days to Extend
    </label>
    <div style={{ position: "relative" }}>
      <input
        type="number"
        min="1"
        className="form-control"
        placeholder="e.g. 7, 15, 30"
        value={extendDays}
        onChange={(e) => handleDaysChange(e.target.value)}
        required
        style={{ height: "42px", fontSize: "0.95rem", fontWeight: "600" }}
      />
      <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "0.82rem", color: "#64748b", pointerEvents: "none" }}>
        Days
      </span>
    </div>
  </div>

  {/* Field 2: Or Choose Calendar Expiry Date (Synced with Days) */ }
  <div className="form-group" style={{ marginBottom: "1rem" }}>
    <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "#1e293b", marginBottom: "5px", display: "block" }}>
      Or Choose Expiry Date (Calendar)
    </label>
    <div style={{ position: "relative" }}>
      <input
        type="date"
        className="form-control"
        value={expiryDate}
        onChange={(e) => handleCalendarDateChange(e.target.value)}
        required
        style={{ height: "42px", fontSize: "0.92rem" }}
      />
    </div>
  </div>

  {/* Field 3: Indian Time Selection (12-Hour AM/PM) */ }
  <div className="form-group" style={{ marginBottom: "1.2rem" }}>
    <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "#1e293b", marginBottom: "5px", display: "block" }}>
      Expiry Time
    </label>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
      {/* Hour */}
      <select
        className="form-control"
        value={timeHour}
        onChange={(e) => setTimeHour(e.target.value)}
        style={{ height: "40px" }}
      >
        {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((hr) => (
          <option key={hr} value={hr}>
            {hr} hr
          </option>
        ))}
      </select>

      {/* Minute */}
      <select
        className="form-control"
        value={timeMinute}
        onChange={(e) => setTimeMinute(e.target.value)}
        style={{ height: "40px" }}
      >
        {["00", "15", "30", "45", "59"].map((min) => (
          <option key={min} value={min}>
            {min} min
          </option>
        ))}
      </select>

      {/* AM/PM */}
      <select
        className="form-control"
        value={timePeriod}
        onChange={(e) => setTimePeriod(e.target.value)}
        style={{ height: "40px", fontWeight: "700", color: timePeriod === "PM" ? "#b45309" : "#059669" }}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  </div>

  {/* Short Note: Dynamic calculation summary */ }
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  padding: "0.7rem 0.85rem",
                  borderRadius: "8px",
                  marginBottom: "1.2rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "6px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: "700",
                      color: "#15803d",
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                    }}
                  >
                    New Expiry Date &amp; Time
                  </span>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: "700",
                      color: "#166534",
                      background: "#dcfce7",
                      border: "1px solid #bbf7d0",
                      padding: "2px 7px",
                      borderRadius: "5px",
                    }}
                  >
                    +{extendDays} Days
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: "700",
                    color: "#14532d",
                    marginTop: "3px",
                    wordBreak: "break-word",
                  }}
                >
                  {calculatedFinalExpiry ? formatIndianDateTime(calculatedFinalExpiry) : "Calculating..."}
                </div>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "0.72rem",
                    color: "#166534",
                    lineHeight: "1.35",
                    wordBreak: "break-word",
                  }}
                >
                  A confirmation email with this date &amp; time will be automatically sent to <strong>{selectedVendor.email}</strong>.
                </p>
              </div >

    {/* Buttons */ }
    <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  style={{ height: "38px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ height: "38px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                  disabled={submitting}
                >
                  {submitting ? "Extending..." : "Confirm & Extend"}
                </button>
              </div >
            </form >
          </div >
        </div >
      )}
    </div >
  );
};

export default PlanExtension;
