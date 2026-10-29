import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Loader,
  Calendar,
  Lock,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getVendorCheckoutDetails,
  createVendorCheckoutOrderApi,
  verifyVendorCheckoutPaymentApi,
} from "../../api/mainVendorApi";
import { loadCashfreeSdk } from "../../utils/cashfreeSdk";

const PaySubscription = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const vendorId = searchParams.get("vendorId");
  const returnOrderId = searchParams.get("order_id");

  const [loading, setLoading] = useState(true);
  const [vendorData, setVendorData] = useState(null);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const verifiedRef = useRef(false);

  // 1. Check for Return from Cashfree Redirect or Fetch Details
  useEffect(() => {
    if (!vendorId) {
      setErrorMessage("Invalid or missing Vendor ID link.");
      setLoading(false);
      return;
    }

    if (returnOrderId) {
      if (!verifiedRef.current) {
        verifiedRef.current = true;
        handleVerifyReturnPayment(vendorId, returnOrderId);
      }
    } else {
      fetchDetails(vendorId);
    }
  }, [vendorId, returnOrderId]);

  const fetchDetails = async (id) => {
    try {
      setLoading(true);
      const res = await getVendorCheckoutDetails(id);
      if (res.status) {
        if (res.alreadyPaid) {
          setAlreadyPaid(true);
          setVendorData(res.vendor);
        } else {
          setVendorData(res.vendor);
        }
      } else {
        setErrorMessage(res.message || "Failed to load subscription details.");
      }
    } catch (err) {
      console.error("Fetch checkout details error:", err);
      setErrorMessage(err.message || "Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyReturnPayment = async (id, orderId) => {
    try {
      setLoading(true);
      const res = await verifyVendorCheckoutPaymentApi({ vendorId: id, orderId });
      if (res.status) {
        setPaymentSuccess(true);
        setSuccessInfo(res.vendor);
        setVendorData((prev) => prev || res.vendor);
        toast.success(res.message || "Payment verified successfully!", {
          toastId: `verify-payment-${orderId}`,
        });
      } else {
        setErrorMessage(res.message || "Payment verification failed.");
        toast.error(res.message || "Payment verification failed.", {
          toastId: `verify-payment-err-${orderId}`,
        });
      }
    } catch (err) {
      console.error("Verify payment return error:", err);
      setErrorMessage(err.message || "Payment verification error.");
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (!vendorId) return;

    try {
      setIsPaying(true);
      setErrorMessage("");

      const orderRes = await createVendorCheckoutOrderApi({ vendorId });
      if (!orderRes.status || !orderRes.paymentSessionId) {
        throw new Error(orderRes.message || "Failed to initialize payment session.");
      }

      const { paymentSessionId, environment } = orderRes;

      const CashfreeConstructor = await loadCashfreeSdk();
      const cashfree = CashfreeConstructor({
        mode: environment === "PRODUCTION" ? "production" : "sandbox",
      });

      const checkoutOptions = {
        paymentSessionId,
        redirectTarget: "_self", // Full screen redirect
      };

      cashfree.checkout(checkoutOptions);
    } catch (err) {
      console.error("Cashfree pay error:", err);
      setErrorMessage(err.message || "Payment initiation failed.");
      toast.error(err.message || "Could not start payment.");
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.card}>
          <Loader size={36} className="animate-spin" style={{ color: "#F39C12", margin: "0 auto 12px" }} />
          <h2 style={{ fontSize: "1.2rem", color: "#1e293b", margin: 0 }}>
            {returnOrderId ? "Verifying Payment with Cashfree..." : "Loading Subscription Details..."}
          </h2>
          <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "6px" }}>
            Please wait a moment while we process your request.
          </p>
        </div>
      </div>
    );
  }

  // State: Payment Succeeded
  if (paymentSuccess) {
    const transactionId =
      returnOrderId ||
      successInfo?.cashfreePaymentId ||
      successInfo?.cashfreeOrderId ||
      `CF-${Date.now().toString().slice(-8)}`;
    const invoiceId = `INV-${new Date().getFullYear()}-${(
      successInfo?.id ||
      vendorId ||
      "842"
    )
      .toString()
      .slice(-4)
      .toUpperCase()}`;
    const paymentDateFormatted = new Date().toLocaleDateString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const planPeriodString = (() => {
      const start = new Date().toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const end = successInfo?.planEndDate
        ? new Date(successInfo.planEndDate).toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        : "Auto-renewing";
      return `effective from ${start} to ${end}`;
    })();

    return (
      <div style={styles.successPageContainer}>
        {/* Glowing Success Pulsing Ring Icon */}
        <div style={styles.receiptGlowWrapper}>
          <div style={styles.receiptOuterRing}>
            <div style={styles.receiptInnerCircle}>
              <CheckCircle2 size={36} color="#ffffff" strokeWidth={2.6} />
            </div>
          </div>
        </div>

        {/* Heading */}
        <h1 style={styles.receiptTitle}>Payment Success</h1>
        <p style={styles.receiptSubtitle}>
          You have successfully subscribed to{" "}
          <strong style={{ color: "#0f172a" }}>
            {successInfo?.planName || vendorData?.planName || "Vendor Pro"}
          </strong>
        </p>

        {/* Floating Receipt Card */}
        <div style={styles.receiptCard}>
          {/* Plan Banner inside card */}
          <div style={styles.receiptBanner}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "1.2rem" }}>👑</span>
              <div>
                <div style={styles.receiptBannerPlanName}>
                  {successInfo?.planName || vendorData?.planName || "Vendor Membership"}
                </div>
                <div style={styles.receiptBannerValidity}>{planPeriodString}</div>
              </div>
            </div>
            <div style={styles.receiptVerifiedBadge}>
              <CheckCircle2 size={16} color="#0284c7" />
            </div>
          </div>

          {/* Key-Value Details Grid */}
          <div style={styles.receiptGrid}>
            <div style={styles.receiptGridCol}>
              <span style={styles.receiptGridLabel}>Reference ID</span>
              <span style={styles.receiptGridValue}>
                {vendorId ? vendorId.slice(-12).toUpperCase() : "2130 4344 0270"}
              </span>
            </div>
            <div style={styles.receiptGridCol}>
              <span style={styles.receiptGridLabel}>Transaction ID</span>
              <span style={styles.receiptGridValue} title={transactionId}>
                {transactionId.length > 14
                  ? `${transactionId.slice(0, 12)}...`
                  : transactionId}
              </span>
            </div>
            <div style={styles.receiptGridCol}>
              <span style={styles.receiptGridLabel}>Invoice ID</span>
              <span style={styles.receiptGridValue}>{invoiceId}</span>
            </div>

            <div style={styles.receiptGridCol}>
              <span style={styles.receiptGridLabel}>Payment Method</span>
              <span style={styles.receiptGridValue}>Cashfree Gateway</span>
            </div>
            <div style={{ ...styles.receiptGridCol, gridColumn: "span 2" }}>
              <span style={styles.receiptGridLabel}>Payment Time</span>
              <span style={styles.receiptGridValue}>{paymentDateFormatted}</span>
            </div>
          </div>

          {/* Bottom Card Holder & Total Price row */}
          <div style={styles.receiptFooterRow}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={styles.cardCircleLogo}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#ef4444", opacity: 0.9 }} />
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#f59e0b", marginLeft: "-6px", opacity: 0.9 }} />
              </div>
              <div>
                <div style={styles.receiptCardholderName}>
                  {successInfo?.name || vendorData?.name || "Verified Vendor"}
                </div>
                <div style={styles.receiptCardholderEmail}>
                  {successInfo?.email || vendorData?.email}
                </div>
              </div>
            </div>
            <div style={styles.receiptPriceBox}>
              <span style={styles.receiptPaidLabel}>Paid</span>
              <div style={styles.receiptPaidPrice}>
                ₹{Number(
                  successInfo?.paidAmount ||
                  successInfo?.planPrice ||
                  vendorData?.paidAmount ||
                  vendorData?.planPrice ||
                  0
                ).toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button (Centered & Medium sized) */}
        <div style={styles.actionBtnWrapper}>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={styles.primaryBtnMedium}
          >
            <span>Proceed to Vendor Login</span>
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    );
  }

  // State: Already Paid
  if (alreadyPaid) {
    const planPeriodString = (() => {
      const start = new Date().toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      const end = vendorData?.planEndDate
        ? new Date(vendorData.planEndDate).toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        : "Active Subscription";
      return `effective from ${start} to ${end}`;
    })();

    return (
      <div style={styles.successPageContainer}>
        {/* Glowing Success Pulsing Ring Icon */}
        <div style={styles.receiptGlowWrapper}>
          <div style={styles.receiptOuterRing}>
            <div style={styles.receiptInnerCircle}>
              <CheckCircle2 size={36} color="#ffffff" strokeWidth={2.6} />
            </div>
          </div>
        </div>

        {/* Heading */}
        <h1 style={styles.receiptTitle}>Subscription Active</h1>
        <p style={styles.receiptSubtitle}>
          Your account is already active with{" "}
          <strong style={{ color: "#0f172a" }}>
            {vendorData?.planName || "Vendor Plan"}
          </strong>
        </p>

        {/* Floating Receipt Card */}
        <div style={styles.receiptCard}>
          {/* Plan Banner inside card */}
          <div style={styles.receiptBanner}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div>
                <div style={styles.receiptBannerPlanName}>
                  {vendorData?.planName || "Active Membership"}
                </div>
                <div style={styles.receiptBannerValidity}>{planPeriodString}</div>
              </div>
            </div>
            <div style={styles.receiptVerifiedBadge}>
              <CheckCircle2 size={16} color="#0284c7" />
            </div>
          </div>

          {/* Key-Value Details Grid */}
          <div style={styles.receiptGrid}>
            <div style={styles.receiptGridCol}>
              <span style={styles.receiptGridLabel}>Vendor ID</span>
              <span style={styles.receiptGridValue}>
                {vendorData?.id ? vendorData.id.slice(-12).toUpperCase() : "VERIFIED"}
              </span>
            </div>
            <div style={styles.receiptGridCol}>
              <span style={styles.receiptGridLabel}>Account Status</span>
              <span style={{ ...styles.receiptGridValue, color: "#16a34a" }}>Active &amp; Paid</span>
            </div>
            <div style={styles.receiptGridCol}>
              <span style={styles.receiptGridLabel}>Duration</span>
              <span style={styles.receiptGridValue}>
                {vendorData?.durationValue} {vendorData?.durationType}
              </span>
            </div>
          </div>

          {/* Bottom Card Holder & Status row */}
          <div style={styles.receiptFooterRow}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={styles.cardCircleLogo}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#ef4444", opacity: 0.9 }} />
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "#f59e0b", marginLeft: "-6px", opacity: 0.9 }} />
              </div>
              <div>
                <div style={styles.receiptCardholderName}>{vendorData?.name || "Verified Vendor"}</div>
                <div style={styles.receiptCardholderEmail}>{vendorData?.email}</div>
              </div>
            </div>
            <div style={styles.receiptPriceBox}>
              <span style={styles.receiptPaidLabel}>Amount</span>
              <div style={styles.receiptPaidPrice}>
                ₹{Number(
                  vendorData?.paidAmount ||
                  vendorData?.planPrice ||
                  0
                ).toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button (Centered & Medium sized) */}
        <div style={styles.actionBtnWrapper}>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={styles.primaryBtnMedium}
          >
            <span>Go to Vendor Login</span>
            <ArrowRight size={17} />
          </button>
        </div>
      </div>
    );
  }

  // State: Error
  if (errorMessage && !vendorData) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.card}>
          <AlertCircle size={46} color="#ef4444" style={{ margin: "0 auto 10px" }} />
          <h2 style={{ fontSize: "1.3rem", color: "#991b1b", fontWeight: "700" }}>
            Subscription Link Error
          </h2>
          <p style={{ fontSize: "0.9rem", color: "#64748b", margin: "8px 0 24px" }}>
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{ ...styles.primaryBtn, background: "#64748b" }}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Main Checkout Screen (Stripe / Linear style modern SaaS)
  return (
    <div style={styles.pageContainer}>
      <div style={styles.saasCard}>
        {/* Top Brand Header */}
        <div style={styles.saasHeader}>
          <div style={styles.saasBrandRow}>
            <div style={styles.saasLogoBox}>
              <ShieldCheck size={20} color="#2563eb" />
            </div>
            <div>
              <div style={styles.saasBrandTitle}>AuctionBill License</div>
              <div style={styles.saasBrandSub}>Official Checkout • Cashfree Secured</div>
            </div>
          </div>
          <div style={styles.saasLiveBadge}>
            <span style={styles.saasLiveDot} />
            <span>Instant Activation</span>
          </div>
        </div>

        {errorMessage && (
          <div style={styles.alertError}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Invoice Summary Box */}
        <div style={styles.saasInvoiceBox}>
          <div style={styles.saasPlanRow}>
            <div>
              <div style={styles.saasPlanTitle}>
                {vendorData?.planName || "Vendor Membership"}
              </div>
              <div style={styles.saasPlanSubtitle}>
                Billed once • {vendorData?.durationValue} {vendorData?.durationType} full access
              </div>
            </div>
            <div style={styles.saasPriceLarge}>
              <span style={{ fontSize: "1.1rem", fontWeight: "600", marginRight: "2px" }}>₹</span>
              {Number(vendorData?.planPrice || 0).toLocaleString("en-IN")}
            </div>
          </div>

          <div style={styles.saasDivider} />

          {/* Details list */}
          <div style={styles.saasMetaList}>
            <div style={styles.saasMetaRow}>
              <span style={styles.saasMetaLabel}>Subscriber</span>
              <span style={styles.saasMetaValue}>{vendorData?.name || "—"}</span>
            </div>
            <div style={styles.saasMetaRow}>
              <span style={styles.saasMetaLabel}>Account Email</span>
              <span style={styles.saasMetaValue} title={vendorData?.email}>
                {vendorData?.email || "—"}
              </span>
            </div>
            <div style={styles.saasMetaRow}>
              <span style={styles.saasMetaLabel}>Payment Method</span>
              <span style={styles.saasMetaValue}>UPI, Cards, NetBanking</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handlePayNow}
          disabled={isPaying}
          style={{
            ...styles.saasPayBtn,
            opacity: isPaying ? 0.75 : 1,
            cursor: isPaying ? "not-allowed" : "pointer",
          }}
        >
          {isPaying ? (
            <>
              <Loader size={18} className="animate-spin" />
              <span>Connecting Cashfree Gateway...</span>
            </>
          ) : (
            <>
              <Lock size={16} />
              <span>Pay ₹{Number(vendorData?.planPrice || 0).toLocaleString("en-IN")} Now</span>
            </>
          )}
        </button>


      </div>
    </div>
  );
};

const styles = {
  pageContainer: {
    minHeight: "100vh",
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  padding: "1.25rem",
  boxSizing: "border-box",
  position: "relative",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
},
  bgGlowTop: {
    position: "absolute",
    top: "-120px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "600px",
    height: "300px",
    background: "radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0) 70%)",
    pointerEvents: "none",
  },
  bgGlowBottom: {
    position: "absolute",
    bottom: "-150px",
    right: "10%",
    width: "400px",
    height: "300px",
    background: "radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, rgba(14, 165, 233, 0) 70%)",
    pointerEvents: "none",
  },
  // ── Modern SaaS Minimalist Checkout Styles ──
  saasCard: {
    background: "#ffffff",
    borderRadius: "16px",
    boxShadow:
    "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 20px 25px -5px rgba(15, 23, 42, 0.06), 0 0 0 1px #e2e8f0",
    maxWidth: "460px",
    width: "100%",
    padding: "26px",
    boxSizing: "border-box",
    textAlign: "left",
    position: "relative",
    zIndex: 1,
  },
  saasHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  marginBottom: "20px",
    gap: "12px",
      flexWrap: "wrap",
  },
saasBrandRow: {
  display: "flex",
    alignItems: "center",
      gap: "10px",
  },
saasLogoBox: {
  width: "36px",
    height: "36px",
      borderRadius: "10px",
        background: "#eff6ff",
          border: "1px solid #bfdbfe",
            display: "flex",
              alignItems: "center",
                justifyContent: "center",
                  flexShrink: 0,
  },
saasBrandTitle: {
  fontSize: "0.95rem",
    fontWeight: "700",
      color: "#0f172a",
        lineHeight: 1.2,
  },
saasBrandSub: {
  fontSize: "0.72rem",
    color: "#64748b",
      lineHeight: 1.2,
  },
saasLiveBadge: {
  display: "inline-flex",
    alignItems: "center",
      gap: "5px",
        fontSize: "0.72rem",
          fontWeight: "600",
            color: "#047857",
              background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                  padding: "3px 8px",
                    borderRadius: "999px",
  },
saasLiveDot: {
  width: "5px",
    height: "5px",
      borderRadius: "50%",
        background: "#10b981",
  },
saasInvoiceBox: {
  background: "#f8fafc",
    border: "1px solid #e2e8f0",
      borderRadius: "12px",
        padding: "16px 18px",
          marginBottom: "20px",
  },
saasPlanRow: {
  display: "flex",
    justifyContent: "space-between",
      alignItems: "flex-start",
        gap: "12px",
  },
saasPlanTitle: {
  fontSize: "1.05rem",
    fontWeight: "750",
      color: "#0f172a",
        letterSpacing: "-0.01em",
  },
saasPlanSubtitle: {
  fontSize: "0.76rem",
    color: "#64748b",
      marginTop: "2px",
  },
saasPriceLarge: {
  fontSize: "1.55rem",
    fontWeight: "800",
      color: "#0f172a",
        letterSpacing: "-0.025em",
          lineHeight: 1.1,
            whiteSpace: "nowrap",
  },
saasDivider: {
  height: "1px",
    background: "#e2e8f0",
      margin: "14px 0",
  },
saasMetaList: {
  display: "flex",
    flexDirection: "column",
      gap: "8px",
  },
saasMetaRow: {
  display: "flex",
    justifyContent: "space-between",
      alignItems: "flex-start",
        gap: "12px",
          fontSize: "0.84rem",
  },
saasMetaLabel: {
  color: "#64748b",
    fontWeight: "500",
      flexShrink: 0,
  },
saasMetaValue: {
  color: "#0f172a",
    fontWeight: "600",
      textAlign: "right",
        wordBreak: "break-word",
          overflowWrap: "anywhere",
  },
saasPayBtn: {
  width: "100%",
    padding: "12px 18px",
      background: "#e2b212ff",
        color: "#000000ff",
          border: "none",
            borderRadius: "10px",
              fontSize: "0.95rem",
                fontWeight: "600",
                  display: "flex",
                    alignItems: "center",
                      justifyContent: "center",
                        gap: "8px",
                          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)",
                            transition: "background 0.15s ease",
                              cursor: "pointer",
  },
saasFooter: {
  display: "flex",
    alignItems: "center",
      justifyContent: "center",
        gap: "6px",
          fontSize: "0.72rem",
            color: "#64748b",
              marginTop: "14px",
                textAlign: "center",
  },
centerContainer: {
  minHeight: "100vh",
    display: "flex",
      alignItems: "center",
        justifyContent: "center",
          padding: "1.25rem",
            background: "radial-gradient(ellipse at 50% 0%, #fff7ed 0%, #f1f5f9 60%, #e2e8f0 100%)",
              boxSizing: "border-box",
  },
card: {
  background: "#ffffff",
    borderRadius: "20px",
      boxShadow:
  "0 20px 40px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(226, 232, 240, 0.8)",
    maxWidth: "500px",
      width: "100%",
        padding: "clamp(1.25rem, 5vw, 2.25rem)",
          boxSizing: "border-box",
            textAlign: "left",
              position: "relative",
                zIndex: 1,
                  backdropFilter: "blur(8px)",
  },
header: {
  marginBottom: "1.5rem",
  },
headerTopRow: {
  display: "flex",
    alignItems: "center",
      justifyContent: "space-between",
        flexWrap: "wrap",
          gap: "8px",
            marginBottom: "12px",
  },
brandBadge: {
  display: "inline-flex",
    alignItems: "center",
      gap: "6px",
        background: "#fffbeb",
          border: "1px solid #fde68a",
            padding: "4px 10px",
              borderRadius: "999px",
                fontSize: "0.75rem",
                  fontWeight: "700",
                    color: "#b45309",
  },
securePill: {
  display: "inline-flex",
    alignItems: "center",
      gap: "4px",
        background: "#ecfdf5",
          border: "1px solid #a7f3d0",
            padding: "3px 8px",
              borderRadius: "999px",
                fontSize: "0.72rem",
                  fontWeight: "600",
                    color: "#047857",
  },
title: {
  fontSize: "clamp(1.35rem, 3.5vw, 1.65rem)",
    fontWeight: "800",
      color: "#0f172a",
        margin: "0 0 6px 0",
          letterSpacing: "-0.025em",
            lineHeight: 1.25,
  },
subtitle: {
  fontSize: "0.88rem",
    color: "#64748b",
      margin: 0,
        lineHeight: 1.5,
  },
planCard: {
  background: "linear-gradient(145deg, #fffbf5 0%, #fff7ed 100%)",
    border: "1px solid #fed7aa",
      borderRadius: "16px",
        padding: "1.25rem",
          marginBottom: "1.25rem",
            boxShadow: "0 4px 12px -2px rgba(234, 88, 12, 0.05)",
  },
planHeader: {
  display: "flex",
    justifyContent: "space-between",
      alignItems: "flex-start",
        flexWrap: "wrap",
          gap: "12px",
            borderBottom: "1px dashed #fdba74",
              paddingBottom: "12px",
                marginBottom: "12px",
  },
planLabelBadge: {
  display: "inline-block",
    fontSize: "0.72rem",
      fontWeight: "800",
        color: "#c2410c",
          background: "#ffedd5",
            padding: "2px 8px",
              borderRadius: "6px",
                textTransform: "uppercase",
                  letterSpacing: "0.05em",
                    marginBottom: "4px",
  },
planNameText: {
  fontSize: "1.25rem",
    fontWeight: "800",
      color: "#431407",
        letterSpacing: "-0.015em",
          lineHeight: 1.2,
  },
priceContainer: {
  textAlign: "right",
    alignSelf: "center",
  },
priceLabel: {
  display: "block",
    fontSize: "0.72rem",
      color: "#9a3412",
        fontWeight: "600",
          textTransform: "uppercase",
            letterSpacing: "0.04em",
  },
priceAmount: {
  fontSize: "1.75rem",
    fontWeight: "900",
      color: "#c2410c",
        letterSpacing: "-0.03em",
          display: "flex",
            alignItems: "baseline",
              justifyContent: "flex-end",
  },
currencySymbol: {
  fontSize: "1.1rem",
    marginRight: "2px",
      fontWeight: "700",
  },
infoList: {
  display: "flex",
    flexDirection: "column",
      gap: "8px",
  },
infoRow: {
  display: "flex",
    justifyContent: "space-between",
      alignItems: "center",
        gap: "12px",
          fontSize: "0.84rem",
  },
infoKey: {
  color: "#9a3412",
    fontWeight: "500",
  },
infoVal: {
  color: "#431407",
    fontWeight: "700",
      textAlign: "right",
  },
infoValEmail: {
  color: "#431407",
    fontWeight: "700",
      textAlign: "right",
        maxWidth: "200px",
          overflow: "hidden",
            textOverflow: "ellipsis",
              whiteSpace: "nowrap",
  },
trustBox: {
  background: "#f8fafc",
    border: "1px solid #e2e8f0",
      borderRadius: "12px",
        padding: "10px 12px",
          marginBottom: "1.25rem",
  },
trustHeader: {
  display: "flex",
    alignItems: "center",
      gap: "6px",
        marginBottom: "6px",
  },
trustDot: {
  width: "6px",
    height: "6px",
      borderRadius: "50%",
        background: "#10b981",
  },
trustText: {
  fontSize: "0.72rem",
    fontWeight: "700",
      color: "#475569",
        textTransform: "uppercase",
          letterSpacing: "0.04em",
  },
pillContainer: {
  display: "flex",
    flexWrap: "wrap",
      gap: "6px",
  },
methodPill: {
  fontSize: "0.74rem",
    color: "#334155",
      background: "#ffffff",
        border: "1px solid #cbd5e1",
          padding: "3px 8px",
            borderRadius: "6px",
              fontWeight: "500",
  },
primaryBtn: {
  width: "100%",
    padding: "0.95rem 1.25rem",
      background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#ffffff",
          border: "none",
            borderRadius: "12px",
              fontSize: "1rem",
                fontWeight: "700",
                  display: "flex",
                    alignItems: "center",
                      justifyContent: "center",
                        gap: "10px",
                          boxShadow: "0 10px 20px -5px rgba(15, 23, 42, 0.25)",
                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                              letterSpacing: "0.01em",
                                cursor: "pointer",
  },
footerNote: {
  display: "flex",
    alignItems: "center",
      justifyContent: "center",
        gap: "6px",
          fontSize: "0.75rem",
            color: "#64748b",
              marginTop: "14px",
                textAlign: "center",
  },
summaryBox: {
  background: "#f8fafc",
    border: "1px solid #e2e8f0",
      borderRadius: "12px",
        padding: "14px 16px",
          display: "flex",
            flexDirection: "column",
              gap: "8px",
  },
summaryRow: {
  display: "flex",
    justifyContent: "space-between",
      fontSize: "0.88rem",
  },
summaryLabel: {
  color: "#64748b",
  },
summaryVal: {
  fontWeight: "600",
    color: "#0f172a",
  },
successIconBadge: {
  width: "72px",
    height: "72px",
      borderRadius: "50%",
        background: "#ecfdf5",
          border: "2px solid #a7f3d0",
            display: "flex",
              alignItems: "center",
                justifyContent: "center",
                  margin: "0 auto",
  },
alertError: {
  background: "#fef2f2",
    border: "1px solid #fecaca",
      color: "#991b1b",
        padding: "10px 14px",
          borderRadius: "10px",
            fontSize: "0.85rem",
              display: "flex",
                alignItems: "center",
                  gap: "8px",
                    marginBottom: "1rem",
  },
// ── Success State Mockup Styles ──────────────────────────
// ── Success State Mockup Styles (Medium & Fully Responsive) ──
successPageContainer: {
  minHeight: "100vh",
    background: "#f8fafc",
      display: "flex",
        flexDirection: "column",
          alignItems: "center",
            justifyContent: "center",
              padding: "clamp(1rem, 4vw, 2rem) 1rem",
                boxSizing: "border-box",
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
receiptGlowWrapper: {
  display: "flex",
    justifyContent: "center",
      alignItems: "center",
        marginBottom: "12px",
  },
receiptOuterRing: {
  width: "72px",
    height: "72px",
      borderRadius: "50%",
        background: "rgba(34, 197, 94, 0.18)",
          display: "flex",
            alignItems: "center",
              justifyContent: "center",
                boxShadow: "0 0 24px rgba(34, 197, 94, 0.28)",
  },
receiptInnerCircle: {
  width: "50px",
    height: "50px",
      borderRadius: "50%",
        background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
          display: "flex",
            alignItems: "center",
              justifyContent: "center",
                boxShadow: "0 4px 12px rgba(22, 163, 74, 0.35)",
  },
receiptTitle: {
  fontSize: "clamp(1.35rem, 3.5vw, 1.55rem)",
    fontWeight: "800",
      color: "#0f172a",
        margin: "0 0 4px 0",
          letterSpacing: "-0.02em",
            textAlign: "center",
  },
receiptSubtitle: {
  fontSize: "0.86rem",
    color: "#64748b",
      margin: "0 0 18px 0",
        textAlign: "center",
          padding: "0 10px",
  },
receiptCard: {
  background: "#ffffff",
    borderRadius: "18px",
      boxShadow: "0 10px 30px -8px rgba(15, 23, 42, 0.08), 0 0 0 1px #e2e8f0",
        maxWidth: "460px",
          width: "100%",
            padding: "clamp(16px, 3.5vw, 22px)",
              boxSizing: "border-box",
  },
receiptBanner: {
  background: "#f0fdfa",
    border: "1px solid #ccfbf1",
      borderRadius: "12px",
        padding: "10px 14px",
          display: "flex",
            alignItems: "center",
              justifyContent: "space-between",
                gap: "10px",
                  marginBottom: "16px",
  },
receiptBannerPlanName: {
  fontSize: "0.95rem",
    fontWeight: "800",
      color: "#0f766e",
        lineHeight: 1.2,
  },
receiptBannerValidity: {
  fontSize: "0.74rem",
    color: "#14b8a6",
      fontWeight: "600",
        marginTop: "2px",
  },
receiptVerifiedBadge: {
  width: "24px",
    height: "24px",
      borderRadius: "50%",
        background: "#e0f2fe",
          display: "flex",
            alignItems: "center",
              justifyContent: "center",
                flexShrink: 0,
  },
receiptGrid: {
  display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
      gap: "14px 12px",
        paddingBottom: "16px",
          borderBottom: "1px solid #f1f5f9",
            marginBottom: "16px",
  },
receiptGridCol: {
  display: "flex",
    flexDirection: "column",
      gap: "2px",
  },
receiptGridLabel: {
  fontSize: "0.7rem",
    color: "#94a3b8",
      fontWeight: "600",
        letterSpacing: "0.02em",
  },
receiptGridValue: {
  fontSize: "0.85rem",
    color: "#1e293b",
      fontWeight: "700",
        wordBreak: "break-word",
  },
receiptFooterRow: {
  display: "flex",
    alignItems: "center",
      justifyContent: "space-between",
        flexWrap: "wrap",
          gap: "12px",
            paddingTop: "4px",
  },
cardCircleLogo: {
  display: "flex",
    alignItems: "center",
  },
receiptCardholderName: {
  fontSize: "0.86rem",
    fontWeight: "700",
      color: "#0f172a",
        lineHeight: 1.2,
  },
receiptCardholderEmail: {
  fontSize: "0.74rem",
    color: "#64748b",
      wordBreak: "break-word",
  },
receiptPriceBox: {
  display: "flex",
    flexDirection: "column",
      alignItems: "center",
        justifyContent: "center",
          minWidth: "90px",
            textAlign: "center",
              marginLeft: "auto",
                marginRight: "auto",
  },
receiptPaidLabel: {
  fontSize: "0.68rem",
    color: "#94a3b8",
      fontWeight: "600",
        display: "block",
          textTransform: "uppercase",
            letterSpacing: "0.04em",
              textAlign: "center",
  },
receiptPaidPrice: {
  fontSize: "1.35rem",
    fontWeight: "800",
      color: "#0f172a",
        letterSpacing: "-0.02em",
          textAlign: "center",
  },
actionBtnWrapper: {
  width: "100%",
    maxWidth: "460px",
      marginTop: "18px",
        display: "flex",
          justifyContent: "center",
  },
primaryBtnMedium: {
  width: "auto",
    minWidth: "220px",
      maxWidth: "100%",
        padding: "0.75rem 1.6rem",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
              border: "none",
                borderRadius: "10px",
                  fontSize: "0.92rem",
                    fontWeight: "700",
                      display: "inline-flex",
                        alignItems: "center",
                          justifyContent: "center",
                            gap: "8px",
                              boxShadow: "0 6px 16px -3px rgba(15, 23, 42, 0.28)",
                                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                  letterSpacing: "0.01em",
                                    cursor: "pointer",
  },
};

export default PaySubscription;
