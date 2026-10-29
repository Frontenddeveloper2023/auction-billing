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
import {
  createUpgradePaymentOrder,
  verifyAndUpgradePlan,
} from "../../api/mainVendorApi";
import { loadCashfreeSdk } from "../../utils/cashfreeSdk";
import { toast } from "react-toastify";
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

        if (activeSub || vendorPlanId) {
          setSubscription({
            id: currentVendor._id,
            name: currentVendor.name,
            plan: planName,
            planId: activeSub?.subscriptionId || vendorPlanId,
            status: currentVendor.status || "Active",
            hasPendingRequest: !!currentVendor.requestedPlan,
            requestedPlanName:
              currentVendor.requestedPlan?.name ||
              (typeof currentVendor.requestedPlan === "string"
                ? "New Plan"
                : ""),
            startDate: (() => {
              const exp = currentVendor.planEndDate || activeSub?.endDate;
              const rawStart =
                currentVendor.planStartDate ||
                activeSub?.startDate ||
                currentVendor.joinedDate ||
                currentVendor.createdAt;
              // If rawStart matches or exceeds expiry date, compute based on plan duration
              if (exp && rawStart && new Date(rawStart).getTime() >= new Date(exp).getTime()) {
                const days = (vendorPlan.durationType === "year" ? 365 : 30) * (vendorPlan.durationValue || 1);
                return new Date(new Date(exp).getTime() - days * 24 * 60 * 60 * 1000).toISOString();
              }
              return rawStart || new Date().toISOString();
            })(),
            expiryDate:
              currentVendor.planEndDate ||
              activeSub?.endDate ||
              null,
            price: activeSub?.priceAtPurchase ?? vendorPlan.price ?? 0,
            branchCount: activeSub?.branchCount ?? vendorPlan.branchCount ?? 0,
            durationType: vendorPlan.durationType,
            durationValue: vendorPlan.durationValue,
            // Queued Plan info (when upgraded with "after_current" option)
            hasQueuedPlan: !!currentVendor.queuedPlan,
            queuedPlan: currentVendor.queuedPlan,
            queuedPlanStartDate: currentVendor.queuedPlanStartDate,
            queuedPlanEndDate: currentVendor.queuedPlanEndDate,
          });
        }
      }
    } catch (e) {
      console.error("Error fetching subscription data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    checkReturnUpgradePayment();
  }, [currentVendorId]);

  // Handle return from Cashfree redirect after upgrading
  const checkReturnUpgradePayment = async () => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order_id");
    const savedUpgradeStr = sessionStorage.getItem("pending_upgrade_data");

    if (orderId) {
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }

    if (orderId && savedUpgradeStr) {
      sessionStorage.removeItem("pending_upgrade_data");
      try {
        setLoading(true);
        const savedData = JSON.parse(savedUpgradeStr);
        const res = await verifyAndUpgradePlan({
          orderId,
          planId: savedData.planId,
          upgradeType: savedData.upgradeType,
        });

        if (res.status) {
          toast.success("Plan Upgraded Successfully!", { autoClose: 5000 });
          // Refresh page data immediately
          await fetchData();
          setConfirmModal({
            isOpen: true,
            title: "Plan Upgraded Successfully!",
            message: res.message || "Your new plan is now active! All new features and limits are available immediately.",
            variant: "success",
            onConfirm: () => {
              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
            },
            showCancel: false,
            confirmText: "Great!",
          });
        } else {
          toast.error(res.message || "Upgrade verification failed.");
          await fetchData();
        }
      } catch (err) {
        console.error("Upgrade return verify error:", err);
        toast.error(err.message || "Payment verification error");
        await fetchData();
      } finally {
        setLoading(false);
      }
    }
  };

  const confirmUpgrade = async (upgradeType) => {
    if (!selectedUpgradePlan) return;
    setIsUpgradeModalOpen(false);

    try {
      setIsUpgrading(true);

      // Step 1: Create Cashfree upgrade order
      const orderRes = await createUpgradePaymentOrder({
        planId: selectedUpgradePlan._id,
        upgradeType,
      });

      if (!orderRes.status || !orderRes.paymentSessionId) {
        throw new Error(orderRes.message || "Failed to initiate payment session.");
      }

      const { paymentSessionId, orderId, environment } = orderRes;

      // Save pending upgrade state for return redirect
      sessionStorage.setItem(
        "pending_upgrade_data",
        JSON.stringify({
          planId: selectedUpgradePlan._id,
          upgradeType,
          orderId,
        })
      );

      // Load Cashfree JS SDK
      const CashfreeConstructor = await loadCashfreeSdk();
      const cashfree = CashfreeConstructor({
        mode: environment === "PRODUCTION" ? "production" : "sandbox",
      });

      // Step 2: Open full-screen Cashfree checkout
      const checkoutOptions = {
        paymentSessionId,
        redirectTarget: "_self", // Full screen redirect
      };

      cashfree
        .checkout(checkoutOptions)
        .then(async (result) => {
          if (result.error) {
            console.error("Cashfree upgrade checkout error:", result.error);
            sessionStorage.removeItem("pending_upgrade_data");
            toast.info("Payment cancelled. You can try again anytime.");
            setIsUpgrading(false);
            return;
          }

          // In case modal callback resolves in-page
          try {
            const verifyRes = await verifyAndUpgradePlan({
              orderId,
              planId: selectedUpgradePlan._id,
              upgradeType,
            });

            sessionStorage.removeItem("pending_upgrade_data");

            if (verifyRes.status) {
              toast.success("Plan upgraded successfully!");
              setConfirmModal({
                isOpen: true,
                title: "Plan Upgraded Successfully!",
                message:
                  verifyRes.message ||
                  "Your new plan is now active! All new limits are updated.",
                variant: "success",
                onConfirm: () => {
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                  window.location.reload();
                },
                showCancel: false,
                confirmText: "Great!",
              });
            } else {
              toast.error(verifyRes.message || "Payment verification failed.");
            }
          } catch (verifyErr) {
            console.error("Upgrade verify error:", verifyErr);
            toast.error(verifyErr.message || "Upgrade verification failed");
          } finally {
            setIsUpgrading(false);
          }
        })
        .catch((checkoutErr) => {
          console.error("Cashfree checkout error:", checkoutErr);
          sessionStorage.removeItem("pending_upgrade_data");
          toast.info("Payment cancelled. You can try again anytime.");
          setIsUpgrading(false);
        });
    } catch (e) {
      console.error("Upgrade error:", e);
      sessionStorage.removeItem("pending_upgrade_data");
      toast.error(e.message || "Error initiating plan upgrade.");
      setIsUpgrading(false);
    }
  };

  const handleDownloadInvoice = (invoice) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297mm

    // --- Header Background Accent Bar ---
    doc.setFillColor(30, 41, 59); // Sleek Slate Navy
    doc.rect(0, 0, pageWidth, 42, "F");

    // Orange brand accent line
    doc.setFillColor(243, 156, 18); // Gold/Orange
    doc.rect(0, 42, pageWidth, 3, "F");

    // Company Name / Logo text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("AUCTION BILLING SYSTEM", 18, 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);

    // INVOICE big text on right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(243, 156, 18);
    doc.text("INVOICE", pageWidth - 18, 24, { align: "right" });

    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`Receipt #${String(invoice.id).slice(-8).toUpperCase()}`, pageWidth - 18, 33, {
      align: "right",
    });

    // --- Invoice Metadata Grid Cards ---
    const startY = 56;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(18, startY, 82, 38, 3, 3, "F");
    doc.roundedRect(110, startY, 82, 38, 3, 3, "F");

    // Billed To Box
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("BILLED TO / SUBSCRIBER", 24, startY + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(subscription?.name || "Main Vendor", 24, startY + 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Vendor ID: ${String(currentVendorId || "").slice(-8).toUpperCase()}`, 24, startY + 23);
    doc.text("Status: Active Verified Vendor", 24, startY + 30);

    // Invoice Details Box
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("PAYMENT DETAILS", 116, startY + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date of Issue: ${formatDate(invoice.date)}`, 116, startY + 16);
    doc.text(`Payment Gateway: Cashfree Payments (Online)`, 116, startY + 23);
    doc.text(`Valid Till: ${invoice.expiryDate ? formatDate(invoice.expiryDate) : "Annual / Ongoing"}`, 116, startY + 30);

    // Status Badge inside Payment Box
    doc.setFillColor(34, 197, 94); // Emerald Green
    doc.roundedRect(165, startY + 5, 22, 6, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("PAID", 176, startY + 9.5, { align: "center" });

    // --- Table Header ---
    const tableTop = 106;
    doc.setFillColor(241, 245, 249);
    doc.rect(18, tableTop, pageWidth - 36, 10, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text("ITEM & DESCRIPTION", 24, tableTop + 6.5);
    doc.text("BRANCH ALLOCATION", 118, tableTop + 6.5);
    doc.text("TOTAL (INR)", pageWidth - 24, tableTop + 6.5, { align: "right" });

    // Table Content Line
    const rowTop = tableTop + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(invoice.description || invoice.plan || "Subscription Plan", 24, rowTop + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`${invoice.branchCount || 0} Branches Included`, 118, rowTop + 10);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`INR ${invoice.amount.toLocaleString()}`, pageWidth - 24, rowTop + 10, {
      align: "right",
    });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(18, rowTop + 22, pageWidth - 18, rowTop + 22);

    // --- Calculation Summary Section ---
    const summaryTop = rowTop + 28;
    const rightCol = pageWidth - 24;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Subtotal:", 130, summaryTop);
    doc.setTextColor(51, 65, 85);
    doc.text(`INR ${invoice.amount.toLocaleString()}`, rightCol, summaryTop, {
      align: "right",
    });

    doc.setTextColor(100, 116, 139);
    doc.text("Tax / GST (Inclusive):", 130, summaryTop + 7);
    doc.setTextColor(51, 65, 85);
    doc.text("INR 0.00", rightCol, summaryTop + 7, { align: "right" });

    // Grand Total Highlight Bar
    doc.setFillColor(254, 243, 199); // Soft gold container
    doc.roundedRect(124, summaryTop + 12, 68, 14, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(180, 83, 9);
    doc.text("Total Paid:", 130, summaryTop + 21);
    doc.setFontSize(13);
    doc.text(`INR ${invoice.amount.toLocaleString()}`, rightCol - 4, summaryTop + 21, {
      align: "right",
    });

    // Notes on the left side
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Payment Mode: Cashfree Payment Gateway (Online)", 20, summaryTop + 14);

    // --- Footer Note ---
    doc.setDrawColor(226, 232, 240);
    doc.line(18, pageHeight - 22, pageWidth - 18, pageHeight - 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Thank you for choosing Auction Billing System! For support: support@auctionbilling.com", 18, pageHeight - 15);
    doc.text("Page 1 of 1", pageWidth - 18, pageHeight - 15, { align: "right" });

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
          <LoadingSpinner message="Verifying upgrade payment & activating plan..." />
        </div>
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
                <span className="sb-info-label">Plan Start Date</span>
                <span className="sb-info-value">
                  {formatDate(subscription.startDate)}
                </span>
              </div>
              <div className="sb-info-item">
                <CalendarDays size={14} className="sb-info-icon" />
                <span className="sb-info-label">Plan Expiry Date</span>
                <span className="sb-info-value">
                  {formatDate(subscription.expiryDate)}
                </span>
              </div>
            </div>

            <div className="sb-features-block">
              <div className="sb-features-title">Current Plan Limits</div>
              <ul className="sb-features-list">
                <li>
                  <CheckCircle2 size={13} className="sb-check-icon" />
                  <strong>{subscription.branchCount || 0} Branches Allowed</strong>
                </li>
                <li>
                  <CheckCircle2 size={13} className="sb-check-icon" />
                  Unlimited Auctions &amp; Realtime Billing
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── Queued Next Plan Card (Takes effect after current plan ends) ── */}
        {subscription.hasQueuedPlan && subscription.queuedPlan && (
          <div className="card fade-in sb-queued-plan-card">
            <div className="sb-queued-badge-row">
              <span className="sb-queued-chip">
                <CalendarDays size={13} />
                Upcoming Plan (Queued)
              </span>
              <span className="sb-queued-status">
                Auto-activates on {formatDate(subscription.queuedPlanStartDate || subscription.expiryDate)}
              </span>
            </div>

            <div className="sb-queued-main-row">
              <div>
                <div className="sb-queued-label">Next Subscription</div>
                <div className="sb-queued-plan-name">
                  {subscription.queuedPlan.name || "Next Plan"}
                </div>
              </div>
              <div className="sb-queued-price">
                ₹{Number(subscription.queuedPlan.price || 0).toLocaleString("en-IN")}
                <span>
                  /{subscription.queuedPlan.durationType === "year" ? "yr" : "30d"}
                </span>
              </div>
            </div>

            <div className="sb-queued-dates-grid">
              <div className="sb-queued-date-col">
                <span className="sb-queued-date-lbl">Starts Automatically</span>
                <span className="sb-queued-date-val">
                  {formatDate(subscription.queuedPlanStartDate || subscription.expiryDate)}
                </span>
              </div>
              <div className="sb-queued-date-col">
                <span className="sb-queued-date-lbl">Valid Until</span>
                <span className="sb-queued-date-val">
                  {formatDate(subscription.queuedPlanEndDate)}
                </span>
              </div>
              <div className="sb-queued-date-col">
                <span className="sb-queued-date-lbl">Branch Quota</span>
                <span className="sb-queued-date-val">
                  {subscription.queuedPlan.branchCount || 0} Branches
                </span>
              </div>
            </div>
          </div>
        )}

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
                        <td className="custom-td" data-label="Invoice ID">
                          <span className="sb-inv-id">{inv.id}</span>
                        </td>
                        <td className="custom-td" data-label="Date">
                          <span className="cr-date-badge">
                            {formatDate(inv.date)}
                          </span>
                        </td>
                        <td className="custom-td" data-label="Description">
                          <span className="sb-inv-desc">{inv.description}</span>
                        </td>
                        <td className="custom-td sb-num-col" data-label="Amount">
                          <span className="sb-inv-amount">
                            ₹{inv.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="custom-td sb-center-col" data-label="Status">
                          <span
                            className={`badge ${inv.status?.toLowerCase() === "paid" ? "badge-success" : "badge-warning"}`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="custom-td sb-center-col" data-label="Download">
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

      {/* ── Upgrade Modal (Interactive, Medium, Responsive) ────────── */}
      {isUpgradeModalOpen && selectedUpgradePlan && (
        <div
          className="sb-modal-overlay"
          onClick={() => setIsUpgradeModalOpen(false)}
        >
          <div className="sb-modal sb-modal-medium" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {String(selectedUpgradePlan._id) === String(subscription.planId)
                  ? `Renew ${selectedUpgradePlan.name}`
                  : `Upgrade to ${selectedUpgradePlan.name}`}
              </h3>
              <button
                className="modal-close"
                onClick={() => setIsUpgradeModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body sb-modal-body">
              <div className="sb-modal-plan-spotlight">
                <div className="sb-modal-plan-details">
                  <div className="sb-modal-plan-title">{selectedUpgradePlan.name}</div>
                  <div className="sb-modal-plan-sub">
                    {selectedUpgradePlan.branchCount || 0} Branches Allowed • Unlimited Auctions
                  </div>
                </div>
                <div className="sb-modal-plan-price">
                  ₹{Number(selectedUpgradePlan.price || 0).toLocaleString("en-IN")}
                  <span>/{selectedUpgradePlan.durationType === "year" ? "yr" : "30d"}</span>
                </div>
              </div>

              <p className="sb-modal-desc">
                Choose when you want your new <strong>{selectedUpgradePlan.name}</strong> subscription to take effect:
              </p>

              <div className="sb-modal-options">
                {/* Option 1: After Current Plan Ends */}
                <button
                  type="button"
                  className="sb-modal-choice-card"
                  onClick={() => confirmUpgrade("after_current")}
                  disabled={isUpgrading}
                >
                  <div className="sb-choice-icon-box queued">
                    <CalendarDays size={18} />
                  </div>
                  <div className="sb-choice-content">
                    <div className="sb-choice-title-row">
                      <span className="sb-choice-title">Continue After Current Plan</span>
                      <span className="sb-choice-tag recommended">No Days Lost</span>
                    </div>
                    <div className="sb-choice-desc">
                      Current plan stays active. New plan starts on <strong>{formatDate(subscription.expiryDate)}</strong>.
                    </div>
                  </div>
                </button>

                {/* Option 2: Start Today */}
                <button
                  type="button"
                  className="sb-modal-choice-card"
                  onClick={() => confirmUpgrade("from_today")}
                  disabled={isUpgrading}
                >
                  <div className="sb-choice-icon-box instant">
                    <Zap size={18} />
                  </div>
                  <div className="sb-choice-content">
                    <div className="sb-choice-title-row">
                      <span className="sb-choice-title">Activate Immediately</span>
                    </div>
                    <div className="sb-choice-desc">
                      Replaces current plan today. New cycle runs for {selectedUpgradePlan.durationValue || 1} {selectedUpgradePlan.durationType || "month"}.
                    </div>
                  </div>
                </button>
              </div>

              <div className="sb-modal-footer-row">
                <button
                  type="button"
                  className="btn btn-outline sb-modal-cancel-btn"
                  onClick={() => {
                    setIsUpgradeModalOpen(false);
                    setSelectedUpgradePlan(null);
                  }}
                  disabled={isUpgrading}
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
