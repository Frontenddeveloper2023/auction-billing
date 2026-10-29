/**
 * Dynamically loads Cashfree JS SDK v3 on demand
 * Resolves to window.Cashfree
 */
export const loadCashfreeSdk = () => {
  return new Promise((resolve, reject) => {
    if (typeof window.Cashfree !== "undefined") {
      return resolve(window.Cashfree);
    }
    const existingScript = document.getElementById("cashfree-js-sdk");
    if (existingScript) {
      existingScript.onload = () => resolve(window.Cashfree);
      existingScript.onerror = () =>
        reject(new Error("Failed to load Cashfree SDK"));
      return;
    }
    const script = document.createElement("script");
    script.id = "cashfree-js-sdk";
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => resolve(window.Cashfree);
    script.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
    document.body.appendChild(script);
  });
};
