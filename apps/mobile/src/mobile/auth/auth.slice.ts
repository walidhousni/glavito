import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User, Tenant } from '@glavito/shared-types';

export interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  tenant: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User;
        tenant: Tenant;
        accessToken: string;
        refreshToken: string;
      }>
    ) => {
      const { user, tenant, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.tenant = tenant;
      state.token = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.tenant = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
