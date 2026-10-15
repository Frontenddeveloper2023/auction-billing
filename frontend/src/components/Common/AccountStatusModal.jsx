import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearSaasAuthData, setSaasAccountStatusError } from '../../redux/slices/saasAuthSlice';
import { clearVendorAuthData, setVendorAccountStatusError } from '../../redux/slices/vendorAuthSlice';
import { AlertTriangle, UserX, Ghost, CreditCard, LogOut } from 'lucide-react';
import './AccountStatusModal.css';

const AccountStatusModal = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Get errors from both slices
    const saasError = useSelector(state => state.saasAuth.accountStatusError);
    const vendorError = useSelector(state => state.vendorAuth.accountStatusError);

    const error = saasError || vendorError;
    const isSaas = !!saasError;

    if (!error) return null;

    const handleClose = () => {
        // Clear auth and error
        if (isSaas) {
            dispatch(clearSaasAuthData());
            dispatch(setSaasAccountStatusError(null));
        } else {
            dispatch(clearVendorAuthData());
            dispatch(setVendorAccountStatusError(null));
        }

        // Redirect based on role
        if (isSaas) {
            navigate('/saas-admin');
        } else {
            navigate('/');
        }
    };

    const getIcon = () => {
        switch (error.type) {
            case 'deleted': 
            case 'main_deleted': return <Ghost className="status-icon text-danger" size={48} />;
            case 'inactive': 
            case 'main_inactive': return <UserX className="status-icon text-warning" size={48} />;
            case 'expired': return <CreditCard className="status-icon text-error" size={48} />;
            default: return <AlertTriangle className="status-icon text-primary" size={48} />;
        }
    };

    const getTitle = () => {
        switch (error.type) {
            case 'deleted': return 'Account Deleted';
            case 'main_deleted': return 'Main Account Deleted';
            case 'inactive': return 'Account Deactivated';
            case 'main_inactive': return 'Main Account Deactivated';
            case 'expired': return 'Subscription Expired';
            default: return 'Account Status Notification';
        }
    };

    return (
        <div className="status-modal-overlay">
            <div className="status-modal-container fade-in-2">
                <div className="status-modal-content">
                    <div className="status-icon-wrapper">
                        {getIcon()}
                    </div>
                    <h2 className="status-title">{getTitle()}</h2>
                    <p className="status-message">{error.message}</p>
                    <p className="status-subtext">
                        If you believe this is an error, please contact support.
                    </p>
                    <button className="status-btn" onClick={handleClose}>
                        <LogOut size={18} />
                        Back to Login
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountStatusModal;
