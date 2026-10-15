import api from "./api";

// Fetch all email templates
export const getEmailTemplates = async () => {
  try {
    const response = await api.get("/template/email-templates");
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};

// Update email template by key
export const updateEmailTemplate = async (key, data) => {
  try {
    const response = await api.put(`/template/email-templates/${key}`, data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw error.response.data;
    }
    throw error;
  }
};
