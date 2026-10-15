import api from "./api";

// Branch Vendor Login (Email OTP)
export const sendBranchVendorLoginOtp = async (data) => {
  try {
    const response = await api.post("/vendor/send-login-otp", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const verifyBranchVendorLoginOtp = async (data) => {
  try {
    const response = await api.post("/vendor/verify-login-otp", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const vendorLogin = async (data) => {
  try {
    const response = await api.post("/vendor/login", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const getVendorProfile = async (id) => {
  try {
    const response = await api.get(`/vendor/${id}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const updateVendorProfile = async (id, data) => {
  try {
    const response = await api.put(`/vendor/${id}`, data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const forgotPassword = async (data) => {
  try {
    const response = await api.post("/vendor/forgot-password", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const resetPassword = async (data) => {
  try {
    const response = await api.post("/vendor/reset-password", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const changePassword = async (data) => {
  try {
    const response = await api.post("/vendor/change-password", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const getVendorNotifications = async () => {
  try {
    const response = await api.get("/notification/vendor");
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const addProduct = async (data) => {
  try {
    const response = await api.post("/product/add", data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const getProducts = async (params) => {
  try {
    const response = await api.get("/product/list", { params });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const updateProduct = async (id, data) => {
  try {
    const response = await api.put(`/product/update/${id}`, data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

export const deleteProduct = async (id, params) => {
  try {
    const response = await api.delete(`/product/delete/${id}`, { params });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};
export const markNotificationAsRead = async (id) => {
  try {
    const response = await api.put(`/notification/read/${id}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};
