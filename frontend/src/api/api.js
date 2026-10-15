import axios from "axios";
import { store } from "../redux/store";
import { setSaasSessionError, setSaasAccountStatusError } from "../redux/slices/saasAuthSlice";
import { setVendorSessionError, setVendorAccountStatusError } from "../redux/slices/vendorAuthSlice";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Add retry configuration
const RETRY_COUNT = 3;
const RETRY_DELAY = 1000;

// Helper to trigger session expiry based on current context
const triggerSessionExpiry = () => {
    const currentPath = window.location.pathname;
    const isSaaSContext = currentPath.includes('/saas') && !currentPath.includes('/mainvendor');
    const isMainVendorContext = currentPath.includes('/mainvendor');
    const isVendorContext = currentPath.includes('/vendor') && !currentPath.includes('/mainvendor');

    if (isSaaSContext) {
        store.dispatch(setSaasSessionError(true));
    } else if (isMainVendorContext || isVendorContext) {
        store.dispatch(setVendorSessionError(true));
    }
};

const triggerAccountStatusError = (type, message) => {
    const currentPath = window.location.pathname;
    const isSaaSContext = currentPath.includes('/saas') && !currentPath.includes('/mainvendor');
    
    if (isSaaSContext) {
        store.dispatch(setSaasAccountStatusError({ type, message }));
    } else {
        store.dispatch(setVendorAccountStatusError({ type, message }));
    }
};

// Add a request interceptor to add the token
api.interceptors.request.use(
  (config) => {
    const state = store.getState();
    let token = null;

    const currentPath = window.location.pathname;
    const isSaaSContext =
      currentPath.includes("/saas") && !currentPath.includes("/mainvendor");
    const isMainVendorContext = currentPath.includes("/mainvendor");
    const isVendorContext =
      currentPath.includes("/vendor") && !currentPath.includes("/mainvendor");

    if (isSaaSContext) {
      token =
        state.saasAuth?.adminToken ||
        sessionStorage.getItem("admin_token") ||
        localStorage.getItem("admin_token");
    } else if (isMainVendorContext || isVendorContext) {
      token =
        state.vendorAuth?.vendorToken ||
        sessionStorage.getItem("vendorToken") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("token");
    }

    if (!token) {
      const isAdminRoute =
        config.url.includes("/admin") || config.url.includes("/subscription");
      const isVendorRoute =
        config.url.includes("/vendor") && !config.url.includes("/admin");

      if (isAdminRoute) {
        token =
          state.saasAuth?.adminToken ||
          sessionStorage.getItem("admin_token") ||
          localStorage.getItem("admin_token");
      } else if (isVendorRoute) {
        token =
          state.vendorAuth?.vendorToken ||
          sessionStorage.getItem("vendorToken") ||
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");
      } else {
        token =
          state.saasAuth?.adminToken ||
          state.vendorAuth?.vendorToken ||
          sessionStorage.getItem("admin_token") ||
          localStorage.getItem("admin_token") ||
          sessionStorage.getItem("vendorToken") ||
          localStorage.getItem("token") ||
          sessionStorage.getItem("token");
      }
    }

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor for automatic retries
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const { config, response } = error;

              const data = response.data;

      // 🔴 ACCOUNT DELETED
      if (data?.accountDeleted) {
        triggerAccountStatusError('deleted', data.message || "Your account was deleted");
        return Promise.reject(error);
      }
      if (data?.mainVendorAccountDeleted) {
        triggerAccountStatusError('main_deleted', data.message || "Vendor account deleted");
        return Promise.reject(error);
      }

      // 🟠 ACCOUNT INACTIVE
      if (data?.accountInactive) {
        triggerAccountStatusError('inactive', data.message || "Your account is inactive");
        return Promise.reject(error);
      }
      if (data?.mainVendorAccountInactive) {
        triggerAccountStatusError('main_inactive', data.message || "Vendor account is inactive");
        return Promise.reject(error);
      }

      // 🟡 SUBSCRIPTION EXPIRED
      if (data?.planExpired) {
        triggerAccountStatusError('expired', data.message || "Your subscription has expired");
        return Promise.reject(error);
      }

        // Detect 401 Unauthorized or Session Expired status
        if (response && (response.status === 401 || response.data?.sessionExpired)) {
            console.log("Session expired or unauthorized (401), showing popup...");
            triggerSessionExpiry();
            return Promise.reject(error);
        }

        // If config does not exist or retry option is not set, reject
        if (!config || config.retryCount >= RETRY_COUNT) {
            // Also trigger for network errors or exhausted 5xx retries
            if (!response || (response.status >= 500 && response.status <= 599)) {
                console.log("Network error or exhausted retries, showing session popup...");
                // triggerSessionExpiry();
            }
            return Promise.reject(error);
        }

        // Only retry on network errors or 5xx server errors
        const shouldRetry = !response || (response.status >= 500 && response.status <= 599);

        if (!shouldRetry) {
            return Promise.reject(error);
        }

        config.retryCount = (config.retryCount || 0) + 1;

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * config.retryCount));

        console.log(`Retrying request (${config.retryCount}/${RETRY_COUNT})...`);
        return api(config);
    }
);

export default api;
