import React, { useEffect } from "react";
import { Loader } from "lucide-react";
import "./ConfirmationModal.css";

/**
 * A reusable modal component for confirming actions (like delete).
 *
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {string} title - The title of the modal (e.g. "Delete Confirmation")
 * @param {string} message - The main warning message
 * @param {string} subMessage - Optional secondary text (e.g. "This action cannot be undone.")
 * @param {function} onConfirm - Function to call when "Confirm" is clicked
 * @param {function} onCancel - Function to call when "Cancel" is clicked
 * @param {string} confirmText - Text for the confirm button (default: "Confirm")
 * @param {string} cancelText - Text for the cancel button (default: "Cancel")
 * @param {string} variant - 'danger' (red) or 'warning' (yellow) or 'info' (blue)
 * @param {boolean} isLoading - Shows loading state on confirm button when true
 */
const ConfirmationModal = ({
  isOpen,
  onClose,
  title = "Are you sure?",
  message,
  subMessage,
  onConfirm,
  confirmText = "Yes, Delete",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
  showCancel = true,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && !isLoading) onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
      // Prevent body scroll
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose, isLoading]);

  if (!isOpen) return null;

  return (
    <div
      className="confirm-modal-overlay"
      onClick={isLoading ? undefined : onClose}
    >
      <div
        className={`confirm-modal-container fade-in-up ${variant}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-modal-icon">
          {variant === "danger" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          )}
          {variant === "warning" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          )}
          {variant === "info" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          )}
          {variant === "success" && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          )}
        </div>

        <div className="confirm-modal-content">
          <h3 className="confirm-modal-title">{title}</h3>
          <p className="confirm-modal-message">{message}</p>
          {subMessage && (
            <p className="confirm-modal-submessage">{subMessage}</p>
          )}
        </div>

        <div className="confirm-modal-actions">
          {showCancel && (
            <button
              className="btn-cancel"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </button>
          )}
          <button
            className={`btn-confirm ${variant}`}
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            {isLoading && <Loader size={16} className="saas-spinner" />}
            {isLoading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
