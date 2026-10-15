import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    vendorLoggedIn: sessionStorage.getItem('vendorLoggedIn') === 'true',
    vendorUserEmail: sessionStorage.getItem('vendorUserEmail') || '',
    vendorUserName: sessionStorage.getItem('vendorUserName') || '',
    vendorUserPhoto: sessionStorage.getItem('vendorUserPhoto') || '',
    vendorUserPhone: sessionStorage.getItem('vendorUserPhone') || '',
    vendorUserAddress: sessionStorage.getItem('vendorUserAddress') || '',
    vendorId: sessionStorage.getItem('vendorId') || '',
    vendorToken: sessionStorage.getItem('vendorToken') || '',
    branchCount: sessionStorage.getItem('branchCount') ? parseInt(sessionStorage.getItem('branchCount')) : 0,
    sessionError: false,
    accountStatusError: null, // { type: 'deleted' | 'inactive' | 'expired', message: string }
};

const vendorAuthSlice = createSlice({
    name: 'vendorAuth',
    initialState,
    reducers: {
        setVendorSessionError: (state, action) => {
            state.sessionError = action.payload;
        },
        setVendorAccountStatusError: (state, action) => {
            state.accountStatusError = action.payload;
        },
        setVendorAuthData: (state, action) => {
            const { user, token } = action.payload;

            state.vendorLoggedIn = true;
            state.vendorUserEmail = user.email || '';
            state.vendorUserName = user.name || '';
            state.vendorUserPhoto = user.profilePic || '';
            state.vendorToken = token || '';
            state.vendorId = user._id || '';
            state.vendorUserPhone = user.phone || '';
            state.vendorUserAddress = user.address || '';
            state.branchCount = user.plan?.branchCount || 0;
            state.sessionError = false;
            state.accountStatusError = null;

            sessionStorage.setItem('vendorLoggedIn', 'true');
            sessionStorage.setItem('vendorUserEmail', user.email || '');
            sessionStorage.setItem('vendorUserName', user.name || '');
            sessionStorage.setItem('vendorUserPhoto', user.profilePic || '');
            sessionStorage.setItem('vendorToken', token || '');
            sessionStorage.setItem('vendorId', user._id || '');
            sessionStorage.setItem('vendorUserPhone', user.phone || '');
            sessionStorage.setItem('vendorUserAddress', user.address || '');
            sessionStorage.setItem('branchCount', (user.plan?.branchCount || 0).toString());
        },
        setVendorBranchCount: (state, action) => {
            state.branchCount = action.payload;
            sessionStorage.setItem('branchCount', action.payload.toString());
        },
        updateVendorProfileData: (state, action) => {
            const { name, photo, phone, address } = action.payload;

            if (name !== undefined) {
                state.vendorUserName = name;
                sessionStorage.setItem('vendorUserName', name);
            }
            if (photo !== undefined) {
                state.vendorUserPhoto = photo;
                sessionStorage.setItem('vendorUserPhoto', photo);
            }
            if (phone !== undefined) {
                state.vendorUserPhone = phone;
                sessionStorage.setItem('vendorUserPhone', phone);
            }
            if (address !== undefined) {
                state.vendorUserAddress = address;
                sessionStorage.setItem('vendorUserAddress', address);
            }
        },
        clearVendorAuthData: (state) => {
            state.vendorLoggedIn = false;
            state.vendorUserEmail = '';
            state.vendorUserName = '';
            state.vendorUserPhoto = '';
            state.vendorToken = '';
            state.vendorId = '';
            state.vendorUserPhone = '';
            state.vendorUserAddress = '';
            state.branchCount = 0;
            state.sessionError = false;
            state.accountStatusError = null;

            sessionStorage.removeItem('vendorLoggedIn');
            sessionStorage.removeItem('vendorUserEmail');
            sessionStorage.removeItem('vendorUserName');
            sessionStorage.removeItem('vendorUserPhoto');
            sessionStorage.removeItem('vendorToken');
            sessionStorage.removeItem('vendorId');
            sessionStorage.removeItem('vendorUserPhone');
            sessionStorage.removeItem('vendorUserAddress');
            sessionStorage.removeItem('branchCount');

            localStorage.removeItem('vendorLoggedIn');
            localStorage.removeItem('vendorUserEmail');
            localStorage.removeItem('vendorUserName');
            localStorage.removeItem('vendorUserPhoto');
            localStorage.removeItem('vendorUserPhone');
            localStorage.removeItem('vendorUserAddress');
            localStorage.removeItem('branchCount');
        }
    }
});

export const { setVendorAuthData, clearVendorAuthData, updateVendorProfileData, setVendorSessionError, setVendorAccountStatusError, setVendorBranchCount } = vendorAuthSlice.actions;

export default vendorAuthSlice.reducer;
