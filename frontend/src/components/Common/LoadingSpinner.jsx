import React from "react";
import { Loader2 } from "lucide-react";

const LoadingSpinner = ({ message = "Loading..." }) => {
  return (
    <div className="loading-state" style={{ textAlign: "center", padding: "3rem" }}>
      <Loader2 className="animate-spin" size={40} style={{ margin: "0 auto", color: "#F39C12" }} />
      <p style={{ marginTop: "1rem" }}>{message}</p>
    </div>
  );
};

export default LoadingSpinner;
