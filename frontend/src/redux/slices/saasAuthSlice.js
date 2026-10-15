import { createSlice } from '@reduxjs/toolkit';

const safeParseJSON = (key) => {
    try {
        const value = sessionStorage.getItem(key);
        if (value && value !== 'undefined') {
            return JSON.parse(value);
        }
    } catch (e) {
        console.error(`Error parsing ${key} from sessionStorage`, e);
    }
    return null;
};

const adminDataObj = safeParseJSON('admin_data') || {};
const saasPermissionsObj = safeParseJSON('saas_permissions') || adminDataObj?.permissions || {};

const initialState = {
    adminToken: sessionStorage.getItem('admin_token') || null,
    isAdmin: sessionStorage.getItem('is_admin') === 'true',
    adminData: adminDataObj,
    saasAdminName: sessionStorage.getItem('saas_admin_name') || null,
    saasAdminPhoto: sessionStorage.getItem('saas_admin_photo') || null,
    saasRole: sessionStorage.getItem('saas_role') || null,
    saasPermissions: saasPermissionsObj,
    sessionError: false,
    accountStatusError: null, // { type: 'deleted' | 'inactive' | 'expired', message: string }
};

const saasAuthSlice = createSlice({
    name: 'saasAuth',
    initialState,
    reducers: {
        setSaasSessionError: (state, action) => {
            state.sessionError = action.payload;
        },
        setSaasAccountStatusError: (state, action) => {
            state.accountStatusError = action.payload;
        },
        setSaasAuthData: (state, action) => {
            const data = action.payload;

            console.log("data", data);

            if (data.adminToken !== undefined) state.adminToken = data.adminToken;
            if (data.isAdmin !== undefined) state.isAdmin = data.isAdmin;
            if (data.adminData !== undefined) state.adminData = data.adminData;
            if (data.saasAdminName !== undefined) state.saasAdminName = data.saasAdminName;
            if (data.saasAdminPhoto !== undefined) state.saasAdminPhoto = data.saasAdminPhoto;
            if (data.saasRole !== undefined) state.saasRole = data.saasRole;
            if (data.saasPermissions !== undefined) state.saasPermissions = data.saasPermissions;
            state.sessionError = false;
            state.accountStatusError = null;
        },
        clearSaasAuthData: (state) => {
            state.adminToken = null;
            state.isAdmin = false;
            state.adminData = {};
            state.saasAdminName = null;
            state.saasAdminPhoto = null;
            state.saasRole = null;
            state.saasPermissions = {};
            state.sessionError = false;
            state.accountStatusError = null;

            sessionStorage.removeItem('admin_token');
            sessionStorage.removeItem('is_admin');
            sessionStorage.removeItem('admin_data');
            sessionStorage.removeItem('saas_admin_name');
            sessionStorage.removeItem('saas_admin_photo');
            sessionStorage.removeItem('saas_role');
            sessionStorage.removeItem('saas_permissions');

            // Also clear localStorage versions which might have been left over
            localStorage.removeItem('admin_token');
            localStorage.removeItem('is_admin');
            localStorage.removeItem('admin_data');
            localStorage.removeItem('saas_admin_name');
            localStorage.removeItem('saas_admin_photo');
            localStorage.removeItem('saas_role');
            localStorage.removeItem('saas_permissions');
        }
    }
});

export const { setSaasAuthData, clearSaasAuthData, setSaasSessionError, setSaasAccountStatusError } = saasAuthSlice.actions;
export default saasAuthSlice.reducer;
