import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, KeyRound, Loader, ArrowLeft, RefreshCw, Mail } from "lucide-react";
import { toast } from 'react-toastify';
import { jwtDecode } from 'jwt-decode';
import { useDispatch } from 'react-redux';
import { sendAdminLoginOtp, verifyAdminLoginOtp } from '../../api/adminApi';
import { setSaasAuthData } from '../../redux/slices/saasAuthSlice';
import './SaaSAdmin.css';

const SaaSLogin = () => {
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1); // 1 = identifier, 2 = OTP
    const [maskedEmail, setMaskedEmail] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleSendOtp = async (e) => {
        e?.preventDefault();
        if (!identifier.trim()) {
            setErrors({ identifier: "Username or Email is required" });
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            const res = await sendAdminLoginOtp({ identifier: identifier.trim() });
            if (res.status) {
                toast.success(res.message || "OTP sent successfully");
                setMaskedEmail(res.message.replace("OTP sent to ", "") || "");
                setStep(2);
            } else {
                toast.error(res.message || "Failed to send OTP");
            }
        } catch (error) {
            toast.error(error.message || "Account not found or server error");
        } finally {
            setLoading(false);
        }
    };

    const handleResendOtp = async () => {
        setResending(true);
        try {
            const res = await sendAdminLoginOtp({ identifier: identifier.trim() });
            if (res.status) {
                toast.success("A new verification code has been sent!");
            } else {
                toast.error(res.message || "Failed to resend OTP");
            }
        } catch (error) {
            toast.error(error.message || "Failed to resend code");
        } finally {
            setResending(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (!otp.trim()) {
            setErrors({ otp: "Please enter the 6-digit verification code" });
            return;
        }

        setLoading(true);
        setErrors({});

        try {
            const response = await verifyAdminLoginOtp({
                identifier: identifier.trim(),
                otp: otp.trim()
            });

            if (response.status) {
                toast.success(response.message || "Login successful");

                const authData = {
                    adminToken: response.token,
                    isAdmin: true,
                    adminData: response.data,
                };

                sessionStorage.setItem('admin_token', response.token);
                sessionStorage.setItem('is_admin', 'true');
                sessionStorage.setItem('admin_data', JSON.stringify(response.data));

                if (response.data && response.data.username) {
                    sessionStorage.setItem('saas_admin_name', response.data.username);
                    authData.saasAdminName = response.data.username;
                }

                try {
                    const decoded = jwtDecode(response.token);
                    const role = response.data?.role || decoded.role || 'admin';
                    sessionStorage.setItem('saas_role', role);
                    authData.saasRole = role;
                } catch (decodeError) {
                    const role = response.data?.role || 'admin';
                    sessionStorage.setItem('saas_role', role);
                    authData.saasRole = role;
                }

                if (response.data && response.data.permissions) {
                    sessionStorage.setItem('saas_permissions', JSON.stringify(response.data.permissions));
                    authData.saasPermissions = response.data.permissions;
                }

                localStorage.removeItem('admin_token');
                localStorage.removeItem('is_admin');
                localStorage.removeItem('admin_data');
                localStorage.removeItem('saas_admin_name');
                localStorage.removeItem('saas_admin_photo');
                localStorage.removeItem('saas_role');
                localStorage.removeItem('saas_permissions');

                dispatch(setSaasAuthData(authData));
                navigate('/saas/dashboard');
            } else {
                toast.error(response.message || "Invalid verification code");
            }
        } catch (error) {
            toast.error(error.message || "Verification failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="saas-login-container">
            <div className="saas-login-card fade-in">
                <div className="saas-login-header">
                    <p className="saas-subtitle">Super Admin Access</p>
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                        {step === 1 ? 'Enter your credentials to receive a login code' : `Verification code sent to your email`}
                    </p>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleSendOtp} className="saas-login-form" noValidate>
                        <div className="saas-form-group">
                            <label className="saas-label">Username or Email</label>
                            <div className="saas-input-container">
                                <User size={18} className="saas-input-icon" />
                                <input
                                    type="text"
                                    name="identifier"
                                    className={`saas-input saas-input-with-icon ${errors.identifier ? 'input-error' : ''}`}
                                    value={identifier}
                                    onChange={(e) => {
                                        setIdentifier(e.target.value);
                                        if (errors.identifier) setErrors({});
                                    }}
                                    placeholder="Enter your username or email"
                                    disabled={loading}
                                    autoFocus
                                />
                            </div>
                            {errors.identifier && <span className="error-msg">{errors.identifier}</span>}
                        </div>

                        <button type="submit" className="saas-btn btn-primary saas-login-btn" disabled={loading}>
                            {loading ? <><Loader className="saas-spinner" size={18} /> Sending OTP...</> : 'Send Login Code'}
                        </button>

                        <div className="saas-login-footer">
                            <Link to="/" className="saas-link">Back to Main App</Link>
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleVerifyOtp} className="saas-login-form" noValidate>
                        <div className="saas-form-group">
                            <label className="saas-label">Enter 6-Digit Verification Code</label>
                            <div className="saas-input-container">
                                <KeyRound size={18} className="saas-input-icon" />
                                <input
                                    type="text"
                                    name="otp"
                                    maxLength="6"
                                    className={`saas-input saas-input-with-icon ${errors.otp ? 'input-error' : ''}`}
                                    value={otp}
                                    onChange={(e) => {
                                        setOtp(e.target.value.replace(/\D/g, ''));
                                        if (errors.otp) setErrors({});
                                    }}
                                    placeholder="• • • • • •"
                                    disabled={loading}
                                    style={{ letterSpacing: '6px', fontSize: '18px', textAlign: 'center' }}
                                    autoFocus
                                />
                            </div>
                            {errors.otp && <span className="error-msg">{errors.otp}</span>}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', fontSize: '13px' }}>
                            <button
                                type="button"
                                onClick={() => { setStep(1); setOtp(''); }}
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <ArrowLeft size={14} /> Change Username
                            </button>
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={resending}
                                style={{ background: 'none', border: 'none', color: '#F39C12', fontWeight: '600', cursor: resending ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <RefreshCw size={14} className={resending ? 'animate-spin' : ''} /> Resend Code
                            </button>
                        </div>

                        <button type="submit" className="saas-btn btn-primary saas-login-btn" disabled={loading}>
                            {loading ? <><Loader className="saas-spinner" size={18} /> Verifying...</> : 'Verify & Login'}
                        </button>

                        <div className="saas-login-footer">
                            <Link to="/" className="saas-link">Back to Main App</Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default SaaSLogin;
