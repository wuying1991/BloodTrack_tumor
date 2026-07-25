import { defineStore } from 'pinia';
import * as authApi from '@/api/auth';
import { refreshSession } from '@/api/http';
import type {
  AuthUser,
  LoginCredentials,
  RegisterData,
  SmsLoginPayload,
} from '@/types/auth';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/utils/storage';

interface AuthState {
  user: AuthUser | null;
  bootstrapped: boolean;
  loading: boolean;
}

function sessionToUser(session: AuthUser & { accessToken?: string; refreshToken?: string }): AuthUser {
  return {
    _id: session._id,
    email: session.email,
    phone: session.phone,
    fullName: session.fullName,
    settings: session.settings,
    hasPassword: session.hasPassword,
    methods: session.methods,
    canUnbindPhone: session.canUnbindPhone,
    canUnbindEmail: session.canUnbindEmail,
  };
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    bootstrapped: false,
    loading: false,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user && !!getAccessToken(),
    displayName: (state) =>
      state.user?.fullName ||
      state.user?.email ||
      state.user?.phone ||
      '',
  },

  actions: {
    async bootstrap() {
      if (this.bootstrapped) return;
      try {
        let token = getAccessToken();
        if (!token && getRefreshToken()) {
          token = (await refreshSession()) || '';
        }
        if (!token) {
          this.clearLocalSession();
          return;
        }
        this.user = await authApi.getProfile();
      } catch {
        this.clearLocalSession();
      } finally {
        this.bootstrapped = true;
      }
    },

    async login(credentials: LoginCredentials) {
      this.loading = true;
      try {
        const session = await authApi.login(credentials);
        setTokens(session.accessToken, session.refreshToken);
        this.user = sessionToUser(session);
        return this.user;
      } finally {
        this.loading = false;
      }
    },

    async loginWithSms(payload: SmsLoginPayload) {
      this.loading = true;
      try {
        const session = await authApi.loginWithSms(payload);
        setTokens(session.accessToken, session.refreshToken);
        this.user = sessionToUser(session);
        return this.user;
      } finally {
        this.loading = false;
      }
    },

    async register(payload: RegisterData) {
      this.loading = true;
      try {
        const session = await authApi.register(payload);
        setTokens(session.accessToken, session.refreshToken);
        this.user = sessionToUser(session);
        return this.user;
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      this.loading = true;
      const refreshToken = getRefreshToken();
      try {
        try {
          await authApi.logout(refreshToken);
        } catch (err) {
          console.warn('logout API failed', err);
        }
      } finally {
        this.clearLocalSession();
        this.loading = false;
      }
    },

    clearLocalSession() {
      clearTokens();
      this.user = null;
    },

    async deleteAccount(password: string) {
      await authApi.deleteAccount(password);
      this.clearLocalSession();
    },

    async refreshProfile() {
      this.user = await authApi.getProfile();
      return this.user;
    },

    async applyUser(user: AuthUser) {
      this.user = user;
    },

    async updateProfile(fields: {
      fullName?: string;
      dateOfBirth?: string;
      gender?: string;
    }) {
      const user = await authApi.updateProfile(fields);
      this.user = sessionToUser(user);
      return this.user;
    },
  },
});
