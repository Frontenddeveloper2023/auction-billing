import { useState } from 'react';
import { Lock, Eye, EyeOff, Check, ArrowRight, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { adminLogin, updateAdminPassword, verifyAdminPassword } from '../../api/adminApi';
import './SaaSAdmin.css';

const SaaSChangePassword = () => {
  const { saasAdminName } = useSelector((state) => state.saasAuth);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [showPasswords, setShowPasswords] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false
  });

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswords(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVerifyCurrentPassword = async (e) => {
    e.preventDefault();
    if (!passwords.currentPassword) {
      toast.error("Please enter your current password.");
      return;
    }

    setLoading(true);
    try {
      // Get the current logged-in username
      const username = saasAdminName || 'admin';

      const response = await verifyAdminPassword({
        username,
        password: passwords.currentPassword
      });

      if (response && response.status) {
        toast.success("Password verified successfully.");
        setStep(2); // Move to set new password
      } else {
        toast.error(response?.message || "Incorrect current password");
      }
    } catch (error) {
      console.error("Verification error:", error);
      toast.error(error.message || "Invalid password or server error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (passwords.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New Password and Confirm Password do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await updateAdminPassword({
        password: passwords.newPassword
      });

      toast.success(response?.message || "Password changed successfully!");
      // reset
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setStep(1);
      setShowPasswords({ currentPassword: false, newPassword: false, confirmPassword: false });
    } catch (error) {
      console.error("Change password error:", error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="saas-card saas-container-centered">

        <div className="saas-text-center saas-mb-40">
          <h2 className="saas-text-2xl saas-font-bold saas-text-dark">Change Password</h2>
          <p className="saas-text-muted">
            {step === 1 ? 'Verify your current password' : 'Create a new secure password'}
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handleVerifyCurrentPassword}>
            <div className="saas-form-group saas-mb-25">
              <label className="saas-label saas-label-form">Current Password</label>
              <div className="saas-input-container">
                <Lock size={18} className="saas-icon-input" />
                <input
                  type={showPasswords.currentPassword ? "text" : "password"}
                  name="currentPassword"
                  className="saas-input saas-input-with-toggle saas-input-padded"
                  placeholder="Enter current password"
                  value={passwords.currentPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="saas-password-toggle saas-pwd-toggle-btn"
                  onClick={() => togglePasswordVisibility('currentPassword')}
                  tabIndex="-1"
                >
                  {showPasswords.currentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="saas-btn btn-primary saas-btn-wide">
              {loading ? <><Loader className="saas-spinner" size={20} /> Verifying...</> : <><Check size={20} /> Verify Password</>}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSave}>
            <div className="saas-form-group saas-mb-15">
              <label className="saas-label saas-label-form">New Password</label>
              <div className="saas-input-container">
                <Lock size={18} className="saas-icon-input" />
                <input
                  type={showPasswords.newPassword ? "text" : "password"}
                  name="newPassword"
                  className="saas-input saas-input-with-toggle saas-input-padded"
                  placeholder="Enter new password"
                  value={passwords.newPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="saas-password-toggle saas-pwd-toggle-btn"
                  onClick={() => togglePasswordVisibility('newPassword')}
                  tabIndex="-1"
                >
                  {showPasswords.newPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="saas-pwd-hint">Password must be at least 6 characters</p>
            </div>

            <div className="saas-form-group saas-mb-30">
              <label className="saas-label saas-label-form">Confirm New Password</label>
              <div className="saas-input-container">
                <Lock size={18} className="saas-icon-input" />
                <input
                  type={showPasswords.confirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  className="saas-input saas-input-with-toggle saas-input-padded"
                  placeholder="Confirm new password"
                  value={passwords.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="saas-password-toggle saas-pwd-toggle-btn"
                  onClick={() => togglePasswordVisibility('confirmPassword')}
                  tabIndex="-1"
                >
                  {showPasswords.confirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="saas-btn btn-primary saas-btn-wide">
              {loading ? <><Loader className="saas-spinner" size={20} /> Changing Password...</> : <><Check size={20} /> Update Password</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default SaaSChangePassword;
