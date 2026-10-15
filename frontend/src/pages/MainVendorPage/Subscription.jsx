import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { formatDate } from "../../utils/dateUtils";
import { jsPDF } from "jspdf";
import "./MainVendor.css";
import "../../components/TodayAuction/TodayAuction.css";
import {
  CreditCard,
  CheckCircle2,
  TrendingUp,
  Check,
  Plus,
  FileText,
  Download,
  CalendarDays,
  Zap,
} from "lucide-react";
import BackButton from "../../components/Common/BackButton";
import {
  getSubscriptions,
  getMainVendors,
  updateMainVendor,
  getMainVendorPurchasesById,
} from "../../api/adminApi";
import ConfirmationModal from "../../components/Common/ConfirmationModal";
import LoadingSpinner from "../../components/Common/LoadingSpinner";

const Subscription = () => {
  const { vendorId } = useSelector((state) => state.vendorAuth);
  const fallbackVendorId = sessionStorage.getItem("vendorId");
  const currentVendorId = vendorId || fallbackVendorId;

  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    variant: "info",
    onConfirm: () => {},
    showCancel: false,
    confirmText: "OK",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, vendorsRes, purchasesRes] = await Promise.all([
          getSubscriptions(),
          getMainVendors(),
          getMainVendorPurchasesById(currentVendorId),
        ]);

        const fetchedPlans = plansRes.subscriptions || [];
        setPlans(fetchedPlans);

        if (purchasesRes?.purchases) setInvoices(purchasesRes.purchases);

        const vendors = vendorsRes.mainVendors || [];
        const currentVendor = vendors.find((v) => v._id === currentVendorId);

        if (currentVendor) {
          const activeSub = currentVendor.activeSubscription;
          const vendorPlan = currentVendor.plan || {};
          const vendorPlanId =
            typeof vendorPlan === "object" ? vendorPlan._id : vendorPlan;
          const planName = vendorPlan.name || "Current Plan";

          console.log(activeSub);
          console.log(vendorPlan);
          

          if (activeSub || vendorPlanId) {
            setSubscription({
              id: currentVendor._id,
              plan: planName,
              planId: activeSub?.subscriptionId || vendorPlanId,
              status: currentVendor.status || "Active",
              hasPendingRequest: !!currentVendor.requestedPlan,
              requestedPlanName:
                currentVendor.requestedPlan?.name ||
                (typeof currentVendor.requestedPlan === "string"
                  ? "New Plan"
                  : ""),
              startDate:
                activeSub?.startDate ||
                currentVendor.joinedDate ||
                currentVendor.createdAt ||
                new Date().toISOString(),
              expiryDate:
                activeSub?.endDate ||
                currentVendor.planEndDate ||
                new Date(
                  new Date().setFullYear(new Date().getFullYear() + 1),
                ).toISOString(),
              price: activeSub?.priceAtPurchase ?? vendorPlan.price ?? 0,
              branchCount: activeSub?.branchCount ?? vendorPlan.branchCount ?? 0,
              durationType: vendorPlan.durationType,
              durationValue: vendorPlan.durationValue,
            });
          }
        }
      } catch (e) {
        console.error("Error fetching subscription data:", e);
      } finally {
        setLoading(false);
      }
    };

    currentVendorId ? fetchData() : setLoading(false);
  }, [currentVendorId]);

  const calculateDaysRemaining = () => {
    if (!subscription) return 0;
    const diff = new Date(subscription.expiryDate) - new Date();
    return diff < 0 ? 0 : Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const calculateTotalDays = () => {
    if (!subscription) return 365;
    const diff =
      new Date(subscription.expiryDate) - new Date(subscription.startDate);
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 365;
  };

  const handleUpgrade = (plan) => {
    setSelectedUpgradePlan(plan);
    setIsUpgradeModalOpen(true);
  };

  const confirmUpgrade = async (upgradeType) => {
    if (!selectedUpgradePlan) return;
    setIsUpgradeModalOpen(false);
    try {
      const payload = {
        requestedPlan: selectedUpgradePlan._id,
        upgradeType,
      };

      const res = await updateMainVendor(currentVendorId, payload);

      if (res.status) {
        setConfirmModal({
          isOpen: true,
          title: "Upgrade Request Received",
          message: `Upgrade request for ${selectedUpgradePlan.name} sent. Upgrade will be active ${upgradeType === "from_today" ? "from today for 30 days" : "after current plan ends"}. Awaiting admin approval.`,
          variant: "success",
          onConfirm: () => {
            setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            window.location.reload();
          },
          showCancel: false,
          confirmText: "OK",
        });
      } else {
        setConfirmModal({
          isOpen: true,
          title: "Upgrade Failed",
          message: res.message || "Failed to upgrade plan.",
          variant: "danger",
          onConfirm: () =>
            setConfirmModal((prev) => ({ ...prev, isOpen: false })),
          showCancel: false,
          confirmText: "Close",
        });
      }
    } catch (e) {
      console.error("Upgrade error:", e);
      setConfirmModal({
        isOpen: true,
        title: "Error",
        message: "Error upgrading subscription. Please try again.",
        variant: "danger",
        onConfirm: () =>
          setConfirmModal((prev) => ({ ...prev, isOpen: false })),
        showCancel: false,
        confirmText: "Close",
      });
    }
  };

  const handleDownloadInvoice = (invoice) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text("INVOICE", 20, 20);
    doc.setFontSize(10);
    doc.text("Auction Billing SaaS", 20, 30);
    doc.text("123 Tech Park, Chennai", 20, 35);
    doc.text("support@auctionbill.com", 20, 40);
    doc.setFontSize(12);
    doc.text(`Invoice ID: ${invoice.id}`, 140, 30);
    doc.text(`Date: ${invoice.date}`, 140, 36);
    doc.text(`Status: ${invoice.status}`, 140, 42);
    doc.setLineWidth(0.5);
    doc.line(20, 50, 190, 50);
    doc.setFont("helvetica", "bold");
    doc.text("Description", 20, 65);
    doc.text("Amount", 160, 65);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.description, 20, 75);
    doc.text(`INR ${invoice.amount.toLocaleString()}`, 160, 75);
    doc.line(20, 85, 190, 85);
    doc.setFont("helvetica", "bold");
    doc.text("Total", 120, 95);
    doc.text(`INR ${invoice.amount.toLocaleString()}`, 160, 95);
    doc.save(`Invoice_${invoice.id}.pdf`);
  };

  const upgradeOptions = subscription
    ? plans.filter((p) => p.status === "Active")
    : [];
  const daysRemaining = calculateDaysRemaining();
  const totalDays = calculateTotalDays();
  const progressPct = Math.min((daysRemaining / totalDays) * 100, 100);
  const isExpiringSoon = daysRemaining <= 10 && daysRemaining > 0;
  const isExpired = daysRemaining === 0;

  /* ── Loading / No-sub states ────────────────────────── */
  if (loading)
    return (
      <>
        <div className="content-header">
          <div className="header-top">
            <h1>Subscription &amp; Billing</h1>
          </div>
          <div className="breadcrumb">
            <span>Vendor</span>
            <span className="breadcrumb-separator">/</span>
            <span>Subscription</span>
          </div>
        </div>
        <div className="content-body">
          <LoadingSpinner message="Loading subscription details..." />
        </div>
      </>
    );

  if (!subscription)
    return (
      <>
        <div className="content-header">
          <div className="header-top">
            <h1>Subscription &amp; Billing</h1>
          </div>
          <div className="breadcrumb">
            <span>Vendor</span>
            <span className="breadcrumb-separator">/</span>
            <span>Subscription</span>
          </div>
        </div>
        <div className="content-body">
          <div className="empty-state">
            <div className="empty-state-icon">💳</div>
            <p>No active subscription found. Please contact support.</p>
          </div>
        </div>
      </>
    );

  return (
    <>
      {/* ── Page Header ──────────────────────────────── */}
      <div className="content-header">
        <div className="header-top">
          <h1>Subscription &amp; Billing</h1>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span className="sb-plan-chip">
              <Zap size={12} />
              {subscription.plan}
            </span>
            <BackButton />
          </div>
        </div>
        <div className="breadcrumb">
          <span>Vendor</span>
          <span className="breadcrumb-separator">/</span>
          <span>Subscription</span>
        </div>
      </div>

      {/* ── Scrollable body ──────────────────────────── */}
      <div className="content-body sb-body">
        {/* ── Current Plan card ────────────────────── */}
        <div className="card fade-in sb-plan-card">
          {/* Header row */}
          <div className="sb-plan-top">
            <div>
              <div className="sb-plan-label">Current Plan</div>
              <div className="sb-plan-name">{subscription.plan}</div>
            </div>
            <div className="sb-plan-right">
              <span
                className={`sb-status-badge ${isExpired ? "expired" : isExpiringSoon ? "expiring" : "active"}`}
              >
                {isExpired
                  ? "Expired"
                  : isExpiringSoon
                    ? "Expiring Soon"
                    : subscription.status}
              </span>
              <div className="sb-plan-price">
                ₹{subscription.price?.toLocaleString()}
                <span>
                  / {subscription.durationType === "year" ? "year" : "30 days"}
                </span>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="sb-progress-section">
            <div className="sb-progress-labels">
              <span className="sb-days-count">{daysRemaining} days left</span>
              <span className="sb-progress-pct">
                {Math.round(progressPct)}%
              </span>
            </div>
            <div className="sb-progress-track">
              <div
                className={`sb-progress-fill ${isExpiringSoon ? "warning" : isExpired ? "danger" : ""}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Date details + Features in 2-col grid */}
          <div className="sb-plan-info-grid">
            <div className="sb-info-block">
              <div className="sb-info-item">
                <CalendarDays size={14} className="sb-info-icon" />
                <span className="sb-info-label">Start Date</span>
                <span className="sb-info-value">
                  {formatDate(subscription.startDate)}
                </span>
              </div>
              <div className="sb-info-item">
                <CalendarDays size={14} className="sb-info-icon" />
                <span className="sb-info-label">Expiry Date</span>
                <span className="sb-info-value">
                  {formatDate(subscription.expiryDate)}
                </span>
              </div>
            </div>

            <div className="sb-features-block">
              <div className="sb-features-title">Included Features</div>
              <ul className="sb-features-list">
                <li>
                  <CheckCircle2 size={13} className="sb-check-icon" />
                  {subscription.branchCount || 0} Branches Allowed
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Pending Request Alert */}
        {subscription.hasPendingRequest && (
          <div className="card sb-pending-alert fade-in">
            <div className="sb-pending-content">
              <Zap size={20} className="sb-pending-icon" />
              <div>
                <div className="sb-pending-title">Upgrade Request Pending</div>
                <div className="sb-pending-desc">
                  Your request to{" "}
                  {subscription.requestedPlanName
                    .toLowerCase()
                    .includes("renew")
                    ? "renew"
                    : "upgrade to"}{" "}
                  <strong>{subscription.requestedPlanName}</strong> is awaiting
                  admin approval.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Upgrade / Renew Plans ─────────────────── */}
        {upgradeOptions.length > 0 && (
          <div className="fade-in">
            <div className="section-header sb-section-header">
              <h3 className="section-title">
                <TrendingUp size={16} /> Available Plans
              </h3>
            </div>
            <div className="sb-upgrade-grid">
              {upgradeOptions.map((plan, i) => {
                const isCurrent =
                  String(plan._id) === String(subscription.planId);
                return (
                  <div
                    key={i}
                    className={`card sb-upgrade-card ${isCurrent ? "current" : ""}`}
                  >
                    <div className="sb-upgrade-header">
                      <div>
                        {isCurrent && (
                          <span className="sb-current-chip">Current</span>
                        )}
                        <div className="sb-upgrade-name">{plan.name}</div>
                      </div>
                      <div className="sb-upgrade-price">
                        ₹{plan.price.toLocaleString()}
                        <span>
                          /{plan.durationType === "year" ? "yr" : "30d"}
                        </span>
                      </div>
                    </div>
                    <ul className="sb-upgrade-features">
                      <li>
                        <Check size={12} />
                        {plan.branchCount || 0} Branches Allowed
                      </li>
                    </ul>
                    <button
                      className={`btn ${isCurrent ? "btn-outline" : "btn-primary"} sb-upgrade-btn ${subscription.hasPendingRequest ? "disabled" : ""}`}
                      onClick={() =>
                        !subscription.hasPendingRequest && handleUpgrade(plan)
                      }
                      disabled={subscription.hasPendingRequest}
                    >
                      {subscription.hasPendingRequest
                        ? "Request Pending"
                        : isCurrent
                          ? `Renew ${plan.name}`
                          : `Upgrade to ${plan.name}`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Billing History ───────────────────────── */}
        <div className="fade-in">
          <div className="section-header sb-section-header">
            <h3 className="section-title">
              <FileText size={16} /> Billing History
            </h3>
            <span className="cr-count-chip">{invoices.length} invoices</span>
          </div>

          {invoices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🧾</div>
              <p>No billing history yet</p>
            </div>
          ) : (
            <div className="table-responsive bg-card rounded-lg shadow-sm custom-table-wrapper">
              <div className="sb-invoice-scroll">
                <table className="data-table custom-data-table sb-invoice-table">
                  <thead className="bg-tertiary">
                    <tr>
                      <th className="custom-th">Invoice ID</th>
                      <th className="custom-th">Date</th>
                      <th className="custom-th">Description</th>
                      <th className="custom-th sb-num-col">Amount</th>
                      <th className="custom-th sb-center-col">Status</th>
                      <th className="custom-th sb-center-col">Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, idx) => (
                      <tr
                        key={idx}
                        className={`custom-tr ${idx % 2 === 0 ? "sb-row-even" : ""}`}
                      >
                        <td className="custom-td">
                          <span className="sb-inv-id">{inv.id}</span>
                        </td>
                        <td className="custom-td">
                          <span className="cr-date-badge">
                            {formatDate(inv.date)}
                          </span>
                        </td>
                        <td className="custom-td">
                          <span className="sb-inv-desc">{inv.description}</span>
                        </td>
                        <td className="custom-td sb-num-col">
                          <span className="sb-inv-amount">
                            ₹{inv.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="custom-td sb-center-col">
                          <span
                            className={`badge ${inv.status?.toLowerCase() === "paid" ? "badge-success" : "badge-warning"}`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="custom-td sb-center-col">
                          <button
                            className="icon-btn sb-download-btn"
                            onClick={() => handleDownloadInvoice(inv)}
                            title="Download Invoice"
                          >
                            <Download size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Upgrade Modal ─────────────────────────────── */}
      {isUpgradeModalOpen && selectedUpgradePlan && (
        <div
          className="sb-modal-overlay"
          onClick={() => setIsUpgradeModalOpen(false)}
        >
          <div className="sb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {String(selectedUpgradePlan._id) === String(subscription.planId)
                  ? "Renew Plan"
                  : "Upgrade Plan"}
              </h3>
              <button
                className="modal-close"
                onClick={() => setIsUpgradeModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body sb-modal-body">
              <p className="sb-modal-desc">
                You're{" "}
                {String(selectedUpgradePlan._id) === String(subscription.planId)
                  ? "renewing"
                  : "upgrading to"}{" "}
                <strong>{selectedUpgradePlan.name}</strong>. When would you like
                it to start?
              </p>
              <div className="sb-modal-options">
                <button
                  className="btn btn-primary sb-modal-opt-btn"
                  onClick={() => confirmUpgrade("from_today")}
                >
                  <Zap size={15} />
                  Start Today (30 Days)
                </button>
                <button
                  className="btn btn-secondary sb-modal-opt-btn"
                  onClick={() => confirmUpgrade("after_current")}
                >
                  <CalendarDays size={15} />
                  After Current Plan Ends
                </button>
                <button
                  className="btn btn-outline sb-modal-opt-btn"
                  onClick={() => {
                    setIsUpgradeModalOpen(false);
                    setSelectedUpgradePlan(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        showCancel={confirmModal.showCancel}
        confirmText={confirmModal.confirmText}
      />
    </>
  );
};

export default Subscription;
