import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader,
  MapPin,
  Phone,
  Mail,
  User,
  Lock,
} from "lucide-react";
import { getSubscriptions } from "../../../api/adminApi";
import { mainVendorSignup } from "../../../api/mainVendorApi";
import { toast } from "react-toastify";
import SearchableSelect from "../../../components/Common/SearchableSelect.jsx";
import "./Signup.css";
import ConfirmationModal from "../../../components/Common/ConfirmationModal";

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
    password: "",
    confirmPassword: "",
    address: "",
    city: "",
    state: "",
  });

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchStates();
  }, []);

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
      !formData.password ||
      !formData.confirmPassword ||
      !formData.address ||
      !formData.city ||
      !formData.state
    ) {
      return "All fields are required";
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) return "Invalid email address";
    if (!/^\d{10}$/.test(formData.phone))
      return "Phone number must be 10 digits";
    if (formData.password !== formData.confirmPassword)
      return "Passwords do not match";
    if (formData.password.length < 6)
      return "Password must be at least 6 characters";
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

    setIsSubmitting(true);
    try {
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
    } catch (err) {
      const msg = err.message || "Server error occurred";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

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

                <h3 className="form-subtitle" style={{ marginTop: "20px" }}>
                  Security
                </h3>
                <div className="form-group">
                  <label>
                    <Lock size={16} /> Password *
                  </label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Min 6 characters"
                      required
                    />
                    <button
                      type="button"
                      className="toggle-eye"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    <Lock size={16} /> Confirm Password *
                  </label>
                  <div className="password-wrapper">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="Re-enter password"
                      required
                    />
                    <button
                      type="button"
                      className="toggle-eye"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
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
                        <Loader className="spinner" size={18} /> Sending
                        Request...
                      </>
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
