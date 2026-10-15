import api from './api';

export const getDashboardSummary = async (vendorId, DateFilters = {}) => {
    try {
        const response = await api.get(`/dashboard/summary/${vendorId}`, { params: DateFilters });
        return response.data;
    } catch (error) {
        if (error.response && error.response.data) throw error.response.data;
        throw error;
    }
};
