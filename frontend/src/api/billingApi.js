import API from "./api";

// Get billing data for export
export const getBillingData = async (params) => {
  try {
    const response = await API.get("/billing/export-data", { params });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch billing data" };
  }
};
