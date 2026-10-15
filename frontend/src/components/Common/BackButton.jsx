import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "./BackButton.css";

const BackButton = ({ fallback, label = "Back" }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      const defaultDashboard = location.pathname.startsWith("/vendor")
        ? "/vendor/dashboard"
        : "/mainvendor/dashboard";
      navigate(fallback || defaultDashboard);
    }
  };

  return (
    <button
      className="btn-back-section"
      onClick={handleBack}
      title="Back to previous page"
      type="button"
    >
      <ArrowLeft size={16} />
      <span>{label}</span>
    </button>
  );
};

export default BackButton;
