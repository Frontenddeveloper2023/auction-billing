import api from "./api";

// Main Vendor Signup (Free / Direct)
export const mainVendorSignup = async (data) => {
  try {
    const response = await api.post("/main-vendor/signup", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

// Create Cashfree Payment Order
export const createVendorPaymentOrder = async (data) => {
  try {
    const response = await api.post("/main-vendor/create-payment-order", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

// Verify Cashfree Payment and Register
export const verifyAndRegisterVendor = async (data) => {
  try {
    const response = await api.post("/main-vendor/verify-and-signup", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

// Checkout Details from Email Link
export const getVendorCheckoutDetails = async (vendorId) => {
  try {
    const response = await api.get(`/main-vendor/checkout-details/${vendorId}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

// Create Cashfree Order for Email Link Checkout
export const createVendorCheckoutOrderApi = async (data) => {
  try {
    const response = await api.post("/main-vendor/checkout-create-order", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

// Verify Payment for Email Link Checkout
export const verifyVendorCheckoutPaymentApi = async (data) => {
  try {
    const response = await api.post("/main-vendor/checkout-verify-payment", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

// Create Cashfree Payment Order for Upgrade/Renewal
export const createUpgradePaymentOrder = async (data) => {
  try {
    const response = await api.post(
      "/main-vendor/create-upgrade-payment-order",
      data
    );
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

// Verify Cashfree Payment and Upgrade Plan
export const verifyAndUpgradePlan = async (data) => {
  try {
    const response = await api.post(
      "/main-vendor/verify-and-upgrade-plan",
      data
    );
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

// Main Vendor Login (Email OTP)
export const sendMainVendorLoginOtp = async (data) => {
  try {
    const response = await api.post("/main-vendor/send-login-otp", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const verifyMainVendorLoginOtp = async (data) => {
  try {
    const response = await api.post("/main-vendor/verify-login-otp", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const mainVendorLogin = async (data) => {
  try {
    const response = await api.post("/main-vendor/login", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

// Main Vendor Logout
export const mainVendorLogout = async () => {
  try {
    const response = await api.post("/main-vendor/logout");
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const getMainVendorProfile = async (id) => {
  try {
    const response = await api.get(`/main-vendor/profile/${id}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const updateMainVendorProfile = async (id, data) => {
  try {
    const response = await api.put(`/main-vendor/${id}`, data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const mainVendorForgotPassword = async (data) => {
  try {
    const response = await api.post("/main-vendor/forgot-password", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const mainVendorResetPassword = async (data) => {
  try {
    const response = await api.post("/main-vendor/reset-password", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

// Using common change-password for now if available, otherwise define one
export const mainVendorChangePassword = async (data) => {
  try {
    // Reusing update endpoint if it supports password, but usually a separate one is better
    // For now, let's assume it's like vendor's reset/change logic
    const response = await api.post("/main-vendor/change-password", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const getMainVendorSellers = async (params) => {
  try {
    const response = await api.get("/main-vendor/sellers", { params });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const getMainVendorBuyers = async (params) => {
  try {
    const response = await api.get("/main-vendor/buyers", { params });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const getMainVendorBranches = async () => {
  try {
    const response = await api.get("/main-vendor/branches");
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const getMainVendorHistory = async (params) => {
  try {
    const response = await api.get("/main-vendor/history", { params });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const getMainVendorCommissionRecords = async (params) => {
  try {
    const response = await api.get("/main-vendor/commission", { params });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const getMainVendorDashboard = async (params) => {
  try {
    const response = await api.get("/main-vendor/dashboard", { params });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

