import api from './api';

// Get all sellers for a vendor
export const getSellers = async (vendorId) => {
    try {
        const response = await api.get(`/seller/list/${vendorId}`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};

// Get single seller by sellerId
export const getSellerById = async (sellerId) => {
    try {
        const response = await api.get(`/seller/${sellerId}`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};

// Get seller summary (profile, products, ledger, balance)
export const getSellerSummary = async (sellerId) => {
    try {
        const response = await api.get(`/seller/summary/${sellerId}`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};


// Add a new seller
export const createSeller = async (data) => {
    try {
        const response = await api.post('/seller/add', data);
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};

// Update seller details
export const updateSeller = async (sellerId, data) => {
    try {
        const response = await api.put(`/seller/update/${sellerId}`, data);
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};

// Delete a seller
export const deleteSeller = async (sellerId) => {
    try {
        const response = await api.delete(`/seller/delete/${sellerId}`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};

// Toggle seller login status
export const toggleSellerStatus = async (sellerId, status) => {
    try {
        const response = await api.patch(`/seller/status/${sellerId}`, { status });
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};

// Record a payment (pay out to seller)
export const recordSellerPayment = async (data) => {
    try {
        const response = await api.post('/seller/payment/add', data);
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};

// Get all payments for a seller
export const getSellerPayments = async (sellerId) => {
    try {
        const response = await api.get(`/seller/payment/list/${sellerId}`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};
