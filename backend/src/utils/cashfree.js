const axios = require("axios");

/**
 * Returns Cashfree base URL depending on CASHFREE_ENVIRONMENT.
 * Default is SANDBOX.
 */
const getCashfreeBaseUrl = () => {
  const env = (process.env.CASHFREE_ENVIRONMENT || "SANDBOX").toUpperCase();
  return env === "PRODUCTION"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
};

const getCashfreeHeaders = () => {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const apiVersion = process.env.CASHFREE_API_VERSION || "2023-08-01";

  if (!appId || !secretKey) {
    throw new Error(
      "Cashfree credentials missing. Please set CASHFREE_APP_ID and CASHFREE_SECRET_KEY in .env"
    );
  }

  return {
    "Content-Type": "application/json",
    "x-client-id": appId.trim(),
    "x-client-secret": secretKey.trim(),
    "x-api-version": apiVersion.trim(),
  };
};

/**
 * Creates an order on Cashfree PG
 * @param {Object} params
 * @param {string} params.orderId
 * @param {number} params.orderAmount
 * @param {string} params.customerPhone
 * @param {string} params.customerEmail
 * @param {string} params.customerName
 * @param {string} params.customerNote
 */
const createCashfreeOrder = async ({
  orderId,
  orderAmount,
  customerPhone,
  customerEmail,
  customerName,
  customerNote = "Subscription Plan",
  returnUrl,
}) => {
  const baseUrl = getCashfreeBaseUrl();
  const headers = getCashfreeHeaders();

  // Normalize phone to 10 digits if longer/prefixed
  const cleanPhone = (customerPhone || "9999999999")
    .replace(/\D/g, "")
    .slice(-10) || "9999999999";

  const defaultReturnUrl = `${(process.env.CLIENT_URL || "http://localhost:5173/auction-billing-system").replace(/\/$/, "")}/signup?order_id={order_id}`;

  const payload = {
    order_id: orderId,
    order_amount: Number(orderAmount),
    order_currency: "INR",
    customer_details: {
      customer_id: `CUST_${orderId.slice(-12)}`,
      customer_name: customerName || "Vendor",
      customer_email: customerEmail,
      customer_phone: cleanPhone,
    },
    order_meta: {
      return_url: returnUrl || defaultReturnUrl,
      notify_url: undefined,
      payment_methods: "cc,dc,upi,nb,app,paylater",
    },
    order_note: customerNote,
  };

  const response = await axios.post(`${baseUrl}/orders`, payload, { headers });
  return response.data;
};

/**
 * Fetches order details from Cashfree PG
 * @param {string} orderId
 */
const getCashfreeOrder = async (orderId) => {
  const baseUrl = getCashfreeBaseUrl();
  const headers = getCashfreeHeaders();

  const response = await axios.get(`${baseUrl}/orders/${orderId}`, {
    headers,
  });
  return response.data;
};

/**
 * Fetches payment attempts for an order from Cashfree PG
 * @param {string} orderId
 */
const getCashfreeOrderPayments = async (orderId) => {
  const baseUrl = getCashfreeBaseUrl();
  const headers = getCashfreeHeaders();

  const response = await axios.get(`${baseUrl}/orders/${orderId}/payments`, {
    headers,
  });
  return response.data;
};

module.exports = {
  createCashfreeOrder,
  getCashfreeOrder,
  getCashfreeOrderPayments,
  getCashfreeBaseUrl,
};
