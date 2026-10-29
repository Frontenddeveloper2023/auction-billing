import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import {
  Check,
  ArrowRight,
  ArrowLeft,
  Loader,
  MapPin,
  Phone,
  Mail,
  User,
} from "lucide-react";
import { getSubscriptions } from "../../../api/adminApi";
import {
  mainVendorSignup,
  createVendorPaymentOrder,
  verifyAndRegisterVendor,
} from "../../../api/mainVendorApi";
import { toast } from "react-toastify";
import SearchableSelect from "../../../components/Common/SearchableSelect.jsx";
import "./Signup.css";
import ConfirmationModal from "../../../components/Common/ConfirmationModal";
import { loadCashfreeSdk } from "../../../utils/cashfreeSdk";

const Signup = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Plans, 2: Details
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: "",
    message: "",
    variant: "info",
    onConfirm: () => {},
    showCancel: false,
    confirmText: "OK",
  });

  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
  });

  const [error, setError] = useState("");

  const [isVerifyingPayment, setIsVerifyingPayment] = useState(() => {
    return Boolean(new URLSearchParams(window.location.search).get("order_id"));
  });

  useEffect(() => {
    fetchPlans();
    fetchStates();
    checkReturnPayment();
  }, []);

  // Handle return from full-screen Cashfree redirect
  const checkReturnPayment = async () => {
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order_id");
    const savedDataStr = sessionStorage.getItem("pending_vendor_signup");

    if (orderId) {
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname
      );
    }

    if (orderId && savedDataStr) {
      sessionStorage.removeItem("pending_vendor_signup");
      try {
        const savedData = JSON.parse(savedDataStr);
        const verifyRes = await verifyAndRegisterVendor({
          ...savedData,
          orderId,
        });

        setIsVerifyingPayment(false);

        if (verifyRes.status) {
          toast.success("Payment Received Successfully!", { autoClose: 4000 });
          setConfirmModal({
            isOpen: true,
            title: "Payment Received Successfully!",
            message:
              "Thank you! Your payment has been confirmed. Your account details have been sent to our administrator for review. Once approved, you will receive an activation email with your login link.",
            variant: "success",
            onConfirm: () => {
              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
              navigate("/");
            },
            showCancel: false,
            confirmText: "Go to Login",
          });
        } else {
          toast.error(verifyRes.message || "Payment verification failed.");
        }
      } catch (err) {
        setIsVerifyingPayment(false);
        console.error("Return payment error:", err);
        if (err.message && err.message.toLowerCase().includes("already registered")) {
          toast.success("Payment verified! Your account is pending admin approval.");
          setConfirmModal({
            isOpen: true,
            title: "Registration Received",
            message:
              "Your payment and registration details are with our administrator. Once approved, you will receive an activation email with your login link.",
            variant: "success",
            onConfirm: () => {
              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
              navigate("/");
            },
            showCancel: false,
            confirmText: "Go to Login",
          });
        } else {
          toast.error(err.message || "Payment verification error");
        }
      }
    } else if (orderId) {
      setIsVerifyingPayment(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await getSubscriptions();
      if (res.status && res.subscriptions) {
        setPlans(res.subscriptions);
      }
    } catch (err) {
      console.error("Error fetching plans:", err);
      toast.error("Failed to load subscription plans");
    } finally {
      setLoadingPlans(false);
    }
  };

  const fetchStates = async () => {
    setLoadingStates(true);
    try {
      const { data } = await axios.post(
        "https://countriesnow.space/api/v0.1/countries/states",
        { country: "India" },
      );
      if (!data.error) setStates(data.data.states);
    } catch (err) {
      console.error("Error fetching states:", err);
    } finally {
      setLoadingStates(false);
    }
  };

  const fetchCities = async (stateName) => {
    setLoadingCities(true);
    try {
      const { data } = await axios.post(
        "https://countriesnow.space/api/v0.1/countries/state/cities",
        { country: "India", state: stateName },
      );
      if (!data.error) {
        setCities(data.data.map((city) => ({ name: city })));
      } else {
        setCities([]);
      }
    } catch (err) {
      console.error("Error fetching cities:", err);
      setCities([]);
    } finally {
      setLoadingCities(false);
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setStep(2);
    window.scrollTo(0, 0);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError("");

    if (name === "state") {
      setFormData((prev) => ({ ...prev, city: "" }));
      fetchCities(value);
    }
  };

  const validate = () => {
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.address ||
      !formData.city ||
      !formData.state
    ) {
      return "All fields are required";
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) return "Invalid email address";
    if (!/^\d{10}$/.test(formData.phone))
      return "Phone number must be 10 digits";
    return null;
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }

    if (!selectedPlan) {
      toast.error("Please choose a subscription plan first.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const planPrice = Number(selectedPlan.price) || 0;

      // If plan is 0 / free, fallback gracefully to direct registration
      if (planPrice <= 0) {
        const payload = {
          ...formData,
          plan: selectedPlan._id,
        };
        const res = await mainVendorSignup(payload);
        if (res.status) {
          toast.success(res.message || "Registration request submitted!");
          setConfirmModal({
            isOpen: true,
            title: "Registration Successful",
            message:
              "Vendor subscription request received. Our team will review your application and contact you soon.",
            variant: "success",
            onConfirm: () => {
              setConfirmModal((prev) => ({ ...prev, isOpen: false }));
              navigate("/");
            },
            showCancel: false,
            confirmText: "OK",
          });
        } else {
          setError(res.message || "Signup failed");
          toast.error(res.message || "Signup failed");
        }
        setIsSubmitting(false);
        return;
      }

      // Step 1: Create Cashfree order session
      const orderRes = await createVendorPaymentOrder({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        planId: selectedPlan._id,
      });

      if (!orderRes.status || !orderRes.paymentSessionId) {
        throw new Error(orderRes.message || "Could not generate payment session.");
      }

      const { paymentSessionId, orderId, environment } = orderRes;

      // Dynamically load Cashfree SDK on demand
      const CashfreeConstructor = await loadCashfreeSdk();

      // Initialize Cashfree instance (sandbox or production)
      const cashfree = CashfreeConstructor({
        mode: environment === "PRODUCTION" ? "production" : "sandbox",
      });

      // Step 2: Save registration payload for full-screen redirect return
      sessionStorage.setItem(
        "pending_vendor_signup",
        JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          plan: selectedPlan._id,
        })
      );

      // Open Cashfree Drop Checkout (Full screen)
      const checkoutOptions = {
        paymentSessionId: paymentSessionId,
        redirectTarget: "_self", // Full screen in same tab
      };

      cashfree
        .checkout(checkoutOptions)
        .then(async (result) => {
          if (result.error) {
            console.error("Cashfree checkout error:", result.error);
            toast.error(result.error.message || "Payment cancelled or failed.");
            setIsSubmitting(false);
            return;
          }

          if (result.paymentDetails) {
            console.log("Cashfree payment success callback:", result.paymentDetails);
          }

          // Step 3: Verify payment on backend and complete registration
          try {
            const verifyPayload = {
              orderId,
              name: formData.name,
              email: formData.email,
              password: formData.password,
              phone: formData.phone,
              address: formData.address,
              city: formData.city,
              state: formData.state,
              plan: selectedPlan._id,
            };

            const verifyRes = await verifyAndRegisterVendor(verifyPayload);

            if (verifyRes.status) {
              toast.success(
                "Payment received! Registration submitted for admin approval."
              );
              setConfirmModal({
                isOpen: true,
                title: "Payment Received Successfully!",
                message:
                  "Thank you! Your payment has been confirmed. Your account details have been sent to our administrator for review. Once approved, you will receive an activation email with your login link.",
                variant: "success",
                onConfirm: () => {
                  setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                  navigate("/");
                },
                showCancel: false,
                confirmText: "Go to Login",
              });
            } else {
              toast.error(
                verifyRes.message || "Payment verification failed. Please contact support."
              );
              setError(verifyRes.message || "Verification failed");
            }
          } catch (verifyErr) {
            console.error("Verification error:", verifyErr);
            toast.error(
              verifyErr.message ||
                "Failed to verify payment with server. Please contact support with Order ID: " +
                  orderId
            );
            setError(verifyErr.message);
          } finally {
            setIsSubmitting(false);
          }
        })
        .catch((checkoutErr) => {
          console.error("Cashfree popup error:", checkoutErr);
          toast.error(checkoutErr.message || "Payment checkout failed");
          setIsSubmitting(false);
        });
    } catch (err) {
      console.error("Signup flow error:", err);
      const msg = err.message || "Server error occurred";
      setError(msg);
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  if (isVerifyingPayment) {
    return (
      <div className="signup-page">
        <div className="signup-loading">
          <Loader className="spinner" size={40} />
          <p style={{ marginTop: "16px", fontWeight: "600", fontSize: "18px" }}>
            Verifying your payment with Cashfree...
          </p>
          <p style={{ color: "#777", fontSize: "14px" }}>
            Please wait a moment while we set up your registration.
          </p>
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
      </div>
    );
  }

  if (loadingPlans) {
    return (
      <div className="signup-loading">
        <Loader className="spinner" size={40} />
        <p>Loading subscription plans...</p>
      </div>
    );
  }

  return (
    <div className="signup-page">
      <div
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          zIndex: 1000,
        }}
      ></div>
      <div
        className={`signup-container ${step === 1 ? "plans-view" : "form-view"}`}
      >
        {step === 1 ? (
          <div className="plans-section fade-in">
            <div className="section-header">
              <h1>Vendor Registration</h1>
              <p>Choose a plan to start managing your auction business</p>
            </div>

            <div className="plans-grid">
              {plans.map((plan) => (
                <div
                  key={plan._id}
                  className={`plan-card ${selectedPlan?._id === plan._id ? "selected" : ""}`}
                  onClick={() => handlePlanSelect(plan)}
                >
                  {plan.isPopular && (
                    <div className="popular-badge">Most Popular</div>
                  )}
                  <h3 className="plan-name">{plan.name}</h3>
                  <div className="plan-price">
                    <span className="currency">₹</span>
                    <span className="amount">{plan.price}</span>
                    <span className="duration">
                      /{plan.durationType === "year" ? "yr" : "30 days"}
                    </span>
                  </div>
                  <div className="plan-description">
                    {plan.description ||
                      "Access to all branch management and auction tools."}
                  </div>
                  <ul className="plan-features">
                    <li>
                      <Check size={16} /> {plan.branchCount || 0} Branches Allowed
                    </li>
                    
                  </ul>
                  <button className="select-plan-btn">
                    Get Started <ArrowRight size={18} />
                  </button>
                </div>
              ))}
            </div>

            <div className="signup-footer-links">
              <p>
                Already have an account? <Link to="/">Login here</Link>
              </p>
            </div>
          </div>
        ) : (
          <div className="details-section fade-in">
            <div className="section-header">
              <button className="back-btn" onClick={() => setStep(1)}>
                <ArrowLeft size={20} /> Change Plan
              </button>
              <h2>Complete Your Vendor Profile</h2>
              <p>
                You've selected the <strong>{selectedPlan.name}</strong> plan
              </p>
            </div>

            <form onSubmit={handleSignup} className="signup-form-grid">
              <div className="form-column">
                <h3 className="form-subtitle">Business Information</h3>
                <div className="form-group">
                  <label>
                    <User size={16} /> Business Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Mail size={16} /> Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Phone size={16} /> Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    maxLength="10"
                    required
                  />
                </div>
              </div>

              <div className="form-column">
                <h3 className="form-subtitle">Address Details</h3>
                <div className="form-group full-width">
                  <label>
                    <MapPin size={16} /> Street Address *
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Door No, Street Name, Area..."
                    rows="2"
                    required
                  ></textarea>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label>State *</label>
                    <SearchableSelect
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      placeholder="Select State"
                      options={states.map((s) => ({
                        label: s.name,
                        value: s.name,
                      }))}
                      disabled={loadingStates}
                    />
                  </div>

                  <div className="form-group">
                    <label>City *</label>
                    <SearchableSelect
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Select City"
                      options={cities.map((c) => ({
                        label: c.name,
                        value: c.name,
                      }))}
                      disabled={!formData.state || loadingCities}
                    />
                  </div>
                </div>

                <div className="submit-section">
                  <div className="selected-plan-info">
                    <span>Selected Plan:</span>
                    <strong>
                      {selectedPlan.name} (₹{selectedPlan.price})
                    </strong>
                  </div>

                  {error && <div className="form-error">{error}</div>}

                  <button
                    type="submit"
                    className="btn btn-primary submit-btn"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader className="spinner" size={18} /> Processing...
                      </>
                    ) : selectedPlan?.price > 0 ? (
                      `Pay ₹${selectedPlan.price} & Register`
                    ) : (
                      "Submit Vendor Request"
                    )}
                  </button>
                  <p className="terms-text">
                    By clicking submit, you agree to our Terms of Service and
                    Privacy Policy. Your Vendor account will be activated
                    after admin review.
                  </p>
                </div>
              </div>
            </form>
          </div>
        )}
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
    </div>
  );
};

export default Signup;
