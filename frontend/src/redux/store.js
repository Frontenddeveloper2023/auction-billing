import { configureStore } from '@reduxjs/toolkit';
import saasAuthReducer from './slices/saasAuthSlice';
import vendorAuthReducer from './slices/vendorAuthSlice';

export const store = configureStore({
    reducer: {
        saasAuth: saasAuthReducer,
        vendorAuth: vendorAuthReducer,
    },
});
