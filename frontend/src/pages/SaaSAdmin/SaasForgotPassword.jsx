import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { adminForgotPassword, adminResetPassword } from "../../api/adminApi";
import { Eye, EyeOff, Loader, ArrowLeft, Mail, ShieldCheck, Lock } from "lucide-react";
import { toast } from "react-toastify";
import "./SaaSAdmin.css";


const SaasForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [resendTimer, setResendTimer] = useState(0);

    const [formData, setFormData] = useState({
        email: "",
        otp: "",
        newPassword: "",
        confirmPassword: ""
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        if (!formData.email) {
            toast.error("Please enter your email address");
            return;
        }

        setIsLoading(true);
        try {
            const res = await adminForgotPassword({ email: formData.email });
            if (res.status) {
                toast.success(res.message || "OTP sent to your email.");
                setStep(2);
                startResendTimer();
            } else {
                toast.error(res.message || "Failed to send OTP.");
            }
        } catch (err) {
            toast.error(err.message || "Something went wrong.");
        } finally {
            setIsLoading(false);
        }
    };

    const startResendTimer = () => {
        setResendTimer(60); // 60 seconds
        const interval = setInterval(() => {
            setResendTimer((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleResendOTP = async () => {
        if (resendTimer > 0) return;
        
        setIsLoading(true);
        
        try {
            const res = await adminForgotPassword({ email: formData.email });
            if (res.status) {
                toast.success(res.message || "OTP resent to your email.");
                startResendTimer();
            } else {
                toast.error(res.message || "Failed to resend OTP.");
            }
        } catch (err) {
            toast.error(err.message || "Something went wrong.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = (e) => {
        e.preventDefault();
        if (!formData.otp || formData.otp.length < 4) {
            toast.error("Please enter a valid OTP");
            return;
        }
        toast.success("OTP accepted. Please enter your new password.");
        setStep(3);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        const { email, otp, newPassword, confirmPassword } = formData;

        if (!otp || !newPassword || !confirmPassword) {
            toast.error("Please fill in all fields");
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setIsLoading(true);
        try {
            const res = await adminResetPassword({ email, otp, newPassword });
            if (res.status) {
                toast.success("Password reset successfully! Redirecting to login...");
                setTimeout(() => {
                    navigate("/saas-admin");
                }, 3000);
            } else {
                toast.error(res.message || "Failed to reset password.");
            }
        } catch (err) {
            toast.error(err.message || "Something went wrong.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="saas-login-container">
            <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000 }}>

            </div>
            <div className="saas-login-card fade-in">
                <Link to="/saas-admin" className="saas-link" style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '20px' }}>
                    <ArrowLeft size={16} /> Back to Admin Login
                </Link>

                <div className="saas-login-header">
                    <h2 style={{ color: '#333', fontSize: '24px', fontWeight: 'bold' }}>Forgot Password</h2>
                    <p className="saas-subtitle">
                        {step === 1 && "Enter admin email to receive OTP"}
                        {step === 2 && "Enter OTP sent to your email"}
                        {step === 3 && "Set your new admin password"}
                    </p>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleSendOTP} className="saas-login-form">
                        <div className="saas-form-group">
                            <label className="saas-label">Email Address</label>
                            <div className="saas-input-container">
                                <Mail size={18} className="saas-input-icon" />
                                <input
                                    type="email"
                                    name="email"
                                    className="saas-input saas-input-with-icon"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Enter registered email"
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="saas-btn btn-primary saas-login-btn" disabled={isLoading}>
                            {isLoading ? <><Loader className="saas-spinner" size={18} /> Sending...</> : "Send OTP"}
                        </button>
                    </form>
                ) : step === 2 ? (
                    <form onSubmit={handleVerifyOTP} className="saas-login-form">
                        <div className="saas-form-group">
                            <label className="saas-label">OTP</label>
                            <div className="saas-input-container">
                                <ShieldCheck size={18} className="saas-input-icon" />
                                <input
                                    type="text"
                                    name="otp"
                                    className="saas-input saas-input-with-icon"
                                    value={formData.otp}
                                    onChange={handleChange}
                                    placeholder="6-digit OTP"
                                    maxLength="6"
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="saas-btn btn-primary saas-login-btn">
                            Verify OTP
                        </button>
                        
                        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px' }}>
                            <span style={{ color: '#666' }}>Didn't receive the OTP? </span>
                            {resendTimer > 0 ? (
                                <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                                    Wait {formatTime(resendTimer)}
                                </span>
                            ) : (
                                <button 
                                    type="button" 
                                    onClick={handleResendOTP} 
                                    disabled={isLoading}
                                    style={{ 
                                        background: 'transparent', 
                                        border: 'none', 
                                        color: '#007bff', 
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        padding: '0',
                                        fontSize: '14px',
                                        textDecoration: 'none'
                                    }}
                                >
                                    Resend OTP
                                </button>
                            )}
                        </div>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="saas-login-form">
                        <div className="saas-form-group">
                            <label className="saas-label">New Password</label>
                            <div className="saas-input-container">
                                <Lock size={18} className="saas-input-icon" />
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    name="newPassword"
                                    className="saas-input saas-input-with-icon"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    placeholder="New password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="saas-password-toggle"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="saas-form-group">
                            <label className="saas-label">Confirm Password</label>
                            <div className="saas-input-container">
                                <Lock size={18} className="saas-input-icon" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    className="saas-input saas-input-with-icon"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm new password"
                                    required
                                />
                                <button
                                    type="button"
                                    className="saas-password-toggle"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="saas-btn btn-primary saas-login-btn" disabled={isLoading}>
                            {isLoading ? <><Loader className="saas-spinner" size={18} /> Resetting...</> : "Reset Password"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default SaasForgotPassword;
