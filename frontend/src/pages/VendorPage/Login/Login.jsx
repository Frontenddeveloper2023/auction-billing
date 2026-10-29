import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setVendorAuthData } from "../../../redux/slices/vendorAuthSlice";
import { sendMainVendorLoginOtp, verifyMainVendorLoginOtp } from "../../../api/mainVendorApi";
import { sendBranchVendorLoginOtp, verifyBranchVendorLoginOtp } from "../../../api/vendorApi";
import { Loader, Mail, User, Building2, KeyRound, ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "react-toastify";
import "./Login.css";

const VendorLogin = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [loginType, setLoginType] = useState("main"); // 'main' or 'branch'
  const [step, setStep] = useState(1); // 1 = identifier input, 2 = OTP input
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [branchId, setBranchId] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [sentToMessage, setSentToMessage] = useState("");

  useEffect(() => {
    if (
      sessionStorage.getItem("vendorLoggedIn") === "true" ||
      localStorage.getItem("vendorLoggedIn") === "true"
    ) {
      navigate("/mainvendor");
    }
  }, [navigate]);

  const handleTypeChange = (type) => {
    setLoginType(type);
    setError("");
    setStep(1);
    setOtp("");
  };

  // Step 1: Send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (loginType === "branch" && !branchId.trim()) {
      setError("Please enter your Branch ID");
      return;
    }

    setIsLoading(true);

    try {
      let res;
      if (loginType === "main") {
        res = await sendMainVendorLoginOtp({ email: email.trim() });
      } else {
        res = await sendBranchVendorLoginOtp({
          email: email.trim(),
          branchId: branchId.trim(),
        });
      }

      if (res && res.status) {
        toast.success(res.message || "Verification code sent to your email!");
        setSentToMessage(res.message || "OTP sent to your email");
        setStep(2);
      } else {
        setError(res.message || "Failed to send verification code");
      }
    } catch (err) {
      setError(err.message || "Account not found or server error");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setIsResending(true);
    setError("");
    try {
      let res;
      if (loginType === "main") {
        res = await sendMainVendorLoginOtp({ email: email.trim() });
      } else {
        res = await sendBranchVendorLoginOtp({
          email: email.trim(),
          branchId: branchId.trim(),
        });
      }

      if (res && res.status) {
        toast.success("A new verification code has been sent!");
      } else {
        setError(res.message || "Failed to resend code");
      }
    } catch (err) {
      setError(err.message || "Failed to resend verification code");
    } finally {
      setIsResending(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp.trim()) {
      setError("Please enter the 6-digit verification code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      let res;
      if (loginType === "main") {
        res = await verifyMainVendorLoginOtp({
          email: email.trim(),
          otp: otp.trim(),
        });
      } else {
        res = await verifyBranchVendorLoginOtp({
          email: email.trim(),
          branchId: branchId.trim(),
          otp: otp.trim(),
        });
      }

      if (res && res.status && res.token) {
        dispatch(setVendorAuthData(res));
        toast.success("Login successful!");
        if (loginType === "main") {
          navigate("/mainvendor");
        } else {
          navigate("/vendor/dashboard");
        }
      } else {
        setError(res.message || "Invalid verification code");
      }
    } catch (err) {
      setError(err.message || "Verification failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-top-right"></div>
      <div className="login-card">
        <h2>{loginType === "main" ? "Vendor Login" : "Branch Login"}</h2>
        <p className="login-subtitle">
          {step === 1
            ? loginType === "main"
              ? "Sign in with secure email verification"
              : "Access your branch with email verification"
            : sentToMessage || "Enter the verification code sent to your email"}
        </p>

        {/* Login Type Toggle - Only visible on step 1 */}
        {step === 1 && (
          <div className="login-type-toggle">
            <button
              type="button"
              className={`type-btn ${loginType === "main" ? "active" : ""}`}
              onClick={() => handleTypeChange("main")}
            >
              <User size={16} />
              Vendor
            </button>
            <button
              type="button"
              className={`type-btn ${loginType === "branch" ? "active" : ""}`}
              onClick={() => handleTypeChange("branch")}
            >
              <Building2 size={16} />
              Branch
            </button>
          </div>
        )}

        {/* Step 1: Input Credentials */}
        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="login-form">
            <div className="form-group">
              <label>
                {loginType === "main" ? "Vendor Email Address" : "Main Vendor Email"}
              </label>
              <div className="input-container">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter email address"
                  required
                  autoFocus
                />
              </div>
            </div>

            {loginType === "branch" && (
              <div className="form-group">
                <label>Branch ID</label>
                <div className="input-container">
                  <Building2 size={18} className="input-icon" />
                  <input
                    type="text"
                    value={branchId}
                    onChange={(e) => {
                      setBranchId(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter Branch ID (e.g. BRC-12345)"
                    required
                  />
                </div>
              </div>
            )}

            {error && <div className="error-msg">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary login-btn"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader className="saas-spinner login-spinner" size={18} />{" "}
                  Sending Code...
                </>
              ) : (
                "Send Login Code"
              )}
            </button>
          </form>
        ) : (
          /* Step 2: OTP Input */
          <form onSubmit={handleVerifyOtp} className="login-form">
            <div className="form-group">
              <label>6-Digit Verification Code</label>
              <div className="input-container">
                <KeyRound size={18} className="input-icon" />
                <input
                  type="text"
                  maxLength="6"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  placeholder="• • • • • •"
                  style={{ letterSpacing: "6px", fontSize: "18px", textAlign: "center" }}
                  required
                  autoFocus
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
            fontSize: "13px",
              }}
            >
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtp("");
                setError("");
              }}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <ArrowLeft size={14} /> Change Email
            </button>
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={isResending}
              style={{
                background: "none",
                border: "none",
                color: "#F39C12",
                fontWeight: "600",
                cursor: isResending ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <RefreshCw size={14} className={isResending ? "animate-spin" : ""} /> Resend Code
            </button>
          </div>

            {error && <div className="error-msg">{error}</div>}

        <button
          type="submit"
          className="btn btn-primary login-btn"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader className="saas-spinner login-spinner" size={18} />{" "}
              Verifying...
            </>
          ) : (
            "Verify & Login"
          )}
        </button>
      </form>
        )}

      {loginType === "main" && step === 1 && (
        <div className="login-footer">
          <p className="signup-link-text">
            Don't have an account?{" "}
            <Link to="/signup" className="signup-link">
              Request Vendor Access
            </Link>
          </p>
        </div>
      )}
    </div>
    </div >
  );
};

export default VendorLogin;
