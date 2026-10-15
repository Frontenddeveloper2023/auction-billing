import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import VendorLogin from "./pages/VendorPage/Login/Login.jsx";
import ForgotPassword from "./pages/VendorPage/Login/ForgotPassword.jsx";
import VendorChangePassword from "./pages/VendorPage/Login/VendorChangePassword.jsx";
import SaasForgotPassword from "./pages/SaaSAdmin/SaasForgotPassword.jsx";
import VendorLayout from "./pages/VendorPage/VendorLayout.jsx";
import Signup from "./pages/VendorPage/Signup/Signup.jsx";
import Dashboard from "./components/Dashboard/Dashboard.jsx";
import AddProduct from "./components/AddProduct/AddProduct.jsx";
import TodayAuction from "./components/TodayAuction/TodayAuction.jsx";
import History from "./components/History/History.jsx";
import SellerDetails from "./components/SellerDetails/SellerDetails.jsx";
import BuyerDetails from "./components/BuyerDetails/BuyerDetails.jsx";
import CommissionRecord from "./components/CommissionRecord/CommissionRecord.jsx";
import PendingProducts from "./components/PendingProducts/PendingProducts.jsx";
import Billing from "./components/Billing/Billing.jsx";
import SaaSLayout from "./pages/SaaSAdmin/SaaSLayout.jsx";
import SaaSDashboard from "./pages/SaaSAdmin/SaaSDashboard.jsx";
import VendorManagement from "./pages/SaaSAdmin/VendorManagement.jsx";
import Purchases from "./pages/SaaSAdmin/Purchases.jsx";
import SubscriptionManagement from "./pages/SaaSAdmin/SubscriptionManagement.jsx";
import SubAdminManagement from "./pages/SaaSAdmin/SubAdminManagement.jsx";
import AdminProfile from "./pages/SaaSAdmin/AdminProfile.jsx";
import SaaSChangePassword from "./pages/SaaSAdmin/SaaSChangePassword.jsx";
import EmailTemplates from "./pages/SaaSAdmin/EmailTemplates.jsx";
import SaaSLogin from "./pages/SaaSAdmin/SaaSLogin.jsx";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SessionExpires from "./components/Common/SessionExpires";
import AccountStatusModal from "./components/Common/AccountStatusModal";

import { GoogleOAuthProvider } from "@react-oauth/google";

// Main Vendor imports
import MainVendorLayout from "./pages/MainVendorPage/MainVendorLayout.jsx";
import MainVendorDashboard from "./pages/MainVendorPage/MainVendorDashboard.jsx";
import Branches from "./pages/MainVendorPage/Branches.jsx";
import Sellers from "./pages/MainVendorPage/Sellers.jsx";
import Buyers from "./pages/MainVendorPage/Buyers.jsx";
import Subscription from "./pages/MainVendorPage/Subscription.jsx";
import Commission from "./pages/MainVendorPage/Commission.jsx";
import MainVendorHistory from "./pages/MainVendorPage/MainVendorHistory.jsx";

import Profile from "./pages/MainVendorPage/Profile.jsx";

function App() {
 
  useEffect(() => {
    const handleWheel = () => {
      if (document.activeElement.type === "number") {
        document.activeElement.blur();
      }
    };

    document.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID; // Loaded from .env

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter basename={import.meta.env.VITE_BASE_URL}>
        <Routes>
          {/* Vendor Login */}
          <Route path="/" element={<VendorLogin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/signup" element={<Signup />} />

          {/* Vendor area with nested routes */}
          <Route path="/vendor" element={<VendorLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="add-product" element={<AddProduct />} />
            <Route path="today-auction" element={<TodayAuction />} />
            <Route path="pending-products" element={<PendingProducts />} />
            <Route path="history" element={<History />} />
            <Route path="seller-details" element={<SellerDetails />} />
            <Route path="buyer-details" element={<BuyerDetails />} />
            <Route path="commission" element={<CommissionRecord />} />

            <Route path="billing" element={<Billing />} />
            <Route path="change-password" element={<VendorChangePassword />} />
          </Route>

          {/* SaaS Admin Login */}
          <Route path="/saas-admin" element={<SaaSLogin />} />
          <Route
            path="/saas-forgot-password"
            element={<SaasForgotPassword />}
          />

          {/* SaaS Admin Area */}
          <Route path="/saas" element={<SaaSLayout />}>
            <Route index element={<SaaSDashboard />} />
            <Route path="dashboard" element={<SaaSDashboard />} />
            <Route path="purchases" element={<Purchases />} />
            <Route path="vendors" element={<VendorManagement />} />
            <Route path="subscriptions" element={<SubscriptionManagement />} />
            <Route path="subadmins" element={<SubAdminManagement />} />
            <Route path="templates" element={<EmailTemplates />} />
            <Route path="settings" element={<AdminProfile />} />
            <Route path="change-password" element={<SaaSChangePassword />} />
          </Route>

          {/* Main Vendor Area */}
          <Route path="/mainvendor" element={<MainVendorLayout />}>
            <Route index element={<MainVendorDashboard />} />
            <Route path="dashboard" element={<MainVendorDashboard />} />
            <Route path="branches" element={<Branches />} />
            
            {/* Operational Routes for Main Vendor */}
            <Route path="add-product" element={<AddProduct />} />
            <Route path="today-auction" element={<TodayAuction />} />
            <Route path="pending-products" element={<PendingProducts />} />
            <Route path="history" element={<History />} />
            <Route path="seller-details" element={<SellerDetails />} />
            <Route path="buyer-details" element={<BuyerDetails />} />
            <Route path="commission-record" element={<CommissionRecord />} />
            <Route path="billing" element={<Billing />} />

            {/* Management Routes for Main Vendor */}
            <Route path="sellers" element={<Sellers />} />
            <Route path="buyers" element={<Buyers />} />
            <Route path="commission" element={<Commission />} />
            <Route path="main-history" element={<MainVendorHistory />} />
            
            <Route path="subscription" element={<Subscription />} />
            <Route path="manage" element={<Profile />} />
            <Route path="change-password" element={<VendorChangePassword />} />
          </Route>
        </Routes>

        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          pauseOnHover
          draggable
          theme="light"
        />
        <SessionExpires />
        <AccountStatusModal />
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;
