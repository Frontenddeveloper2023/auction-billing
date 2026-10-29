import { useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setSaasAuthData } from '../../redux/slices/saasAuthSlice';
import { User, Camera, Edit, X, Loader, Lock, Eye, EyeOff, ShieldCheck, Mail, Check } from 'lucide-react';
import { toast } from 'react-toastify';
import { updateAdminProfile, sendAdminEmailUpdateOtp, verifyAdminPassword } from '../../api/adminApi';
import './SaaSAdmin.css';

const AdminProfile = () => {
  const dispatch = useDispatch();
  const fileInputRef = useRef(null);
  const { saasAdminName, adminData, saasAdminPhoto } = useSelector((state) => state.saasAuth);

  const [settings, setSettings] = useState({
    adminName: saasAdminName || adminData?.username || "Super Admin",
    adminEmail: adminData?.email || "admin@auctionbill.com",
    adminPhoto: saasAdminPhoto || null
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [emailUpdateStep, setEmailUpdateStep] = useState(0); // 0=none, 1=password, 2=otp
  const [authPassword, setAuthPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, adminPhoto: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    if (!settings.adminName || !settings.adminEmail) {
      return toast.error("Name and email are required");
    }

    const currentEmail = adminData?.email || "admin@auctionbill.com";
    const isEmailChanged = settings.adminEmail !== currentEmail;

    if (isEmailChanged && emailUpdateStep === 0) {
      setEmailUpdateStep(1);
      return;
    }

    await performSave();
  };

  const performSave = async (otpParam = {}) => {
    setIsLoading(true);
    try {
      // Update via backend API
      const payload = {
        username: settings.adminName,
        email: settings.adminEmail,
        ...otpParam
      };

      const response = await updateAdminProfile(payload);

      if (response.status && response.admin) {
        const updatePayload = {
          saasAdminName: response.admin.username,
          adminData: {
            ...adminData,
            username: response.admin.username,
            email: response.admin.email
          }
        };

        if (settings.adminPhoto) {
          sessionStorage.setItem('saas_admin_photo', settings.adminPhoto);
          updatePayload.saasAdminPhoto = settings.adminPhoto;
        }

        sessionStorage.setItem('saas_admin_name', response.admin.username);
        sessionStorage.setItem('saas_admin_email', response.admin.email);
        sessionStorage.setItem('admin_data', JSON.stringify(updatePayload.adminData));
        
        dispatch(setSaasAuthData(updatePayload));

        // Update local state to match API response
        setSettings(prev => ({
          ...prev,
          adminName: response.admin.username,
          adminEmail: response.admin.email
        }));

        // Dispatch event to update Layout
        window.dispatchEvent(new Event('saas_profile_updated'));

        setIsEditing(false);
        setEmailUpdateStep(0);
        setOtp("");
        setAuthPassword("");
        toast.success(response.message || "Profile configurations saved successfully!");
      } else {
        toast.error(response.message || "Failed to update profile");
      }
    } catch (error) {
      toast.error(error.message || "An error occurred while updating the profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPassword = async () => {
    if (!authPassword) {
      return toast.error("Please enter your current password");
    }
    setIsLoading(true);
    try {
      const username = saasAdminName || adminData?.username || 'admin';
      const response = await verifyAdminPassword({ username, password: authPassword });
      
      if (response.status) {
        const otpResponse = await sendAdminEmailUpdateOtp({ email: settings.adminEmail });
        if (otpResponse.status) {
          toast.success(otpResponse.message || "OTP sent to new email.");
          setEmailUpdateStep(2);
        } else {
          toast.error(otpResponse.message || "Failed to send OTP to new email.");
        }
      } else {
        toast.error(response.message || "Incorrect password");
      }
    } catch (error) {
      toast.error(error.message || "Verification failed. Check password.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtpAndSave = async () => {
    if (!otp || otp.length < 4) {
      return toast.error("Please enter a valid OTP");
    }
    await performSave({ otp });
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEmailUpdateStep(0);
    setAuthPassword("");
    setOtp("");
    
    setSettings({
      adminName: saasAdminName || adminData?.username || "Super Admin",
      adminEmail: adminData?.email || "admin@auctionbill.com",
      adminPhoto: saasAdminPhoto || null
    });
  };

  if (emailUpdateStep === 1) {
    return (
      <div className="fade-in">
        <div className="saas-card saas-profile-container">
          <div className="saas-card-header saas-profile-header-wrap">
            <div className="saas-profile-header-title">
              <Lock size={22} className="saas-text-primary" />
              <h3 className="saas-text-lg saas-font-semibold">Security Verification</h3>
            </div>
          </div>
          <div className="saas-modal-content saas-profile-body">
            <p className="saas-profile-step-desc">
              Please enter your current password to authorize changing your email address.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); handleVerifyPassword(); }}>
              <div className="saas-form-group">
                <label className="saas-label">Current Password</label>
                <div className="saas-input-container">
                  <Lock size={18} className="saas-input-icon" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="saas-input saas-input-with-icon"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Enter current password"
                    autoFocus
                  />
                  <button
                    type="button"
                    className="saas-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="saas-profile-actions">
                <button
                  type="button"
                  className="saas-btn btn-outline saas-profile-action-btn"
                  onClick={() => setEmailUpdateStep(0)}
                  disabled={isLoading}
                >
                  <X size={16} /> Cancel
                </button>
                <button
                  type="submit"
                  className="saas-btn btn-primary saas-flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader className="saas-spinner" size={16} /> Verifying...</>
                  ) : (
                    <><Lock size={16} /> Verify Password</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (emailUpdateStep === 2) {
    return (
      <div className="fade-in">
        <div className="saas-card saas-profile-container">
          <div className="saas-card-header saas-profile-header-wrap">
            <div className="saas-profile-header-title">
              <ShieldCheck size={22} className="saas-text-primary" />
              <h3 className="saas-text-lg saas-font-semibold">Verify New Email</h3>
            </div>
          </div>
          <div className="saas-modal-content saas-profile-body">
            <p className="saas-profile-step-desc">
              An OTP has been sent to <strong className="saas-profile-email-highlight">{settings.adminEmail}</strong>. Please enter it below.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); handleVerifyOtpAndSave(); }}>
              <div className="saas-form-group">
                <label className="saas-label">OTP Code</label>
                <div className="saas-input-container">
                  <ShieldCheck size={18} className="saas-input-icon" />
                  <input
                    type="text"
                    className="saas-input saas-input-with-icon saas-profile-otp-input"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="6-digit OTP"
                    maxLength="6"
                    autoFocus
                  />
                </div>
              </div>

              <div className="saas-profile-actions">
                <button
                  type="button"
                  className="saas-btn btn-outline saas-profile-action-btn"
                  onClick={() => setEmailUpdateStep(0)}
                  disabled={isLoading}
                >
                  <X size={16} /> Cancel
                </button>
                <button
                  type="submit"
                  className="saas-btn btn-primary saas-flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader className="saas-spinner" size={16} /> Verifying...</>
                  ) : (
                    <><ShieldCheck size={16} /> Verify OTP & Save</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="saas-card saas-profile-container">
        <div className="saas-card-header saas-profile-header-wrap">
          <div className="saas-profile-header-title">
            <User size={22} className="saas-text-primary" />
            <h3 className="saas-text-lg saas-font-semibold">Admin Profile</h3>
          </div>
          {!isEditing && (
            <button className="saas-btn btn-outline saas-profile-action-btn" onClick={handleEditClick}>
              <Edit size={16} /> Edit Profile
            </button>
          )}
        </div>
        <div className="saas-modal-content saas-profile-body">
          <div className="saas-profile-avatar-banner">
            <div
              className={`saas-profile-avatar-circle ${isEditing ? 'saas-profile-avatar-editable' : ''}`}
              onClick={isEditing ? triggerFileInput : undefined}
              title={isEditing ? "Click to change photo" : undefined}
            >
              {settings.adminPhoto ? (
                <img src={settings.adminPhoto} alt={settings.adminName} className="saas-profile-avatar-img" />
              ) : (
                <span>{(settings.adminName || "SA").substring(0, 2).toUpperCase()}</span>
              )}
              {isEditing && (
                <div className="saas-profile-camera-badge" title="Change photo">
                  <Camera size={13} />
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
            <h4 className="saas-profile-name">{settings.adminName}</h4>
            <p className="saas-profile-email">{settings.adminEmail}</p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); if (isEditing) handleSave(); }}>
            <div className="saas-form-group">
              <label className="saas-label">Admin Name</label>
              {isEditing ? (
                <div className="saas-input-container">
                  <User size={18} className="saas-input-icon" />
                  <input
                    type="text"
                    name="adminName"
                    className="saas-input saas-input-with-icon"
                    value={settings.adminName}
                    onChange={handleChange}
                    placeholder="Enter admin name"
                  />
                </div>
              ) : (
                <div className="saas-profile-readonly">
                  <User size={16} className="saas-profile-readonly-icon" />
                  <span>{settings.adminName}</span>
                </div>
              )}
            </div>

            <div className="saas-form-group">
              <label className="saas-label">Admin Email</label>
              {isEditing ? (
                <div className="saas-input-container">
                  <Mail size={18} className="saas-input-icon" />
                  <input
                    type="email"
                    name="adminEmail"
                    className="saas-input saas-input-with-icon"
                    value={settings.adminEmail}
                    onChange={handleChange}
                    placeholder="Enter admin email"
                  />
                </div>
              ) : (
                <div className="saas-profile-readonly">
                  <Mail size={16} className="saas-profile-readonly-icon" />
                  <span>{settings.adminEmail}</span>
                </div>
              )}
            </div>

            {isEditing && (
              <div className="saas-profile-actions">
                <button
                  type="button"
                  className="saas-btn btn-outline saas-profile-action-btn"
                  onClick={handleCancelClick}
                  disabled={isLoading}
                >
                  <X size={16} /> Cancel
                </button>
                <button
                  type="submit"
                  className="saas-btn btn-primary saas-flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <><Loader className="saas-spinner" size={16} /> Saving...</>
                  ) : (
                    <><Check size={16} /> Save Changes</>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
