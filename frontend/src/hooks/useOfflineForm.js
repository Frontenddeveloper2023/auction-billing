import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";

/**
 * A reusable hook for React forms that provides:
 * 1. Auto-save to localStorage
 * 2. Internet connectivity detection
 * 3. Offline protection (prevents submission when offline)
 * 4. Automatic cleanup after successful submission
 * 
 * @param {string} storageKey - Unique key for localStorage
 * @param {Object} initialValues - Initial field values
 * @param {Function} onSubmit - Function to call on form submit (should be async)
 */
export const useOfflineForm = (storageKey, initialValues, onSubmit) => {
  const [formData, setFormData] = useState(initialValues);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Sync connection status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.info("Back online! You can now sync your data.", {
           position: "top-right",
           autoClose: 3000,
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Internet connection lost. Data will be saved locally.", {
          position: "top-right",
          autoClose: 5000,
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 2. Load saved data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setFormData(prev => ({ ...prev, ...parsedData }));
        toast.info("Restored unsubmitted draft.", {
            position: "bottom-left",
            autoClose: 2000,
        });
      } catch (error) {
        console.error("Failed to parse saved form data", error);
      }
    }
  }, [storageKey]);

  // 3. Auto-save to localStorage when formData changes
  useEffect(() => {
    if (formData && Object.keys(formData).length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(formData));
    }
  }, [formData, storageKey]);

  // Handle input changes
  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  // Manual update for non-event changes (e.g. date pickers)
  const setFieldValue = useCallback((name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialValues);
    localStorage.removeItem(storageKey);
  }, [initialValues, storageKey]);

  // Handle form submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!navigator.onLine) {
      toast.error("No internet connection. Please try again when back online.", {
          position: "top-center"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Clear storage only after successful submission
      localStorage.removeItem(storageKey);
      toast.success("Form submitted successfully!");
      // Optionally reset form state
      // setFormData(initialValues);
    } catch (error) {
      console.error("Form submission failed:", error);
      toast.error(error.response?.data?.message || "Submission failed. Your draft is still saved locally.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    setFormData,
    handleChange,
    setFieldValue,
    handleSubmit,
    resetForm,
    isOnline,
    isSubmitting
  };
};

export default useOfflineForm;
