import api from './api';

// BUYERS
export const getBuyers = async (vendorId) => {
    try {
        const response = await api.get(`/buyer/list/${vendorId}`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};

export const getBuyerSummary = async (buyerId) => {
    try {
        const response = await api.get(`/buyer/summary/${buyerId}`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};

export const addBuyer = async (data) => {
    try {
        const response = await api.post('/buyer/add', data);
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};

export const updateBuyer = async (id, data) => {
    try {
        const response = await api.put(`/buyer/update/${id}`, data);
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};

export const deleteBuyer = async (id) => {
    try {
        const response = await api.delete(`/buyer/delete/${id}`);
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};

// BUYER PAYMENTS
export const getBuyerPayments = async (vendorId, buyerId) => {
    try {
        const response = await api.get(`/buyer/payments/list/${vendorId}`, { params: { buyerId } });
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};

export const addBuyerPayment = async (data) => {
    try {
        const response = await api.post('/buyer/payments/add', data);
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};
