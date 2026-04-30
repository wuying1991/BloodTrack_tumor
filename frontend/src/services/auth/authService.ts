import apiClient from '../api/apiClient';
import { User } from '../../types';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponseData {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  settings?: any;
}

export interface LoginResponse {
  success: boolean;
  data: AuthResponseData & TokenPair;
}

export interface RegisterResponse {
  success: boolean;
  data: AuthResponseData & TokenPair;
}

export interface RefreshTokenResponse {
  success: boolean;
  data: TokenPair;
}

export interface LogoutResponse {
  success: boolean;
  message: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
}

class AuthService {
  /**
   * Login user with credentials
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return apiClient.post<LoginResponse>('/auth/login', credentials);
  }

  /**
   * Register a new user
   */
  async register(userData: RegisterData): Promise<RegisterResponse> {
    return apiClient.post<RegisterResponse>('/auth/register', userData);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    return apiClient.post<RefreshTokenResponse>('/auth/refresh-token', {
      refreshToken,
    });
  }

  /**
   * Logout user (invalidate tokens on server)
   */
  async logout(): Promise<LogoutResponse> {
    return apiClient.post<LogoutResponse>('/auth/logout', {});
  }

  async forgotPassword(
    email: string
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/auth/forgot-password', { email });
  }

  async resetPassword(
    token: string,
    password: string
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post('/auth/reset-password', { token, password });
  }

  async getProfile(): Promise<{ success: boolean; data: User }> {
    return apiClient.get('/auth/profile');
  }

  async updateProfile(
    fields: Partial<
      Pick<User, 'firstName' | 'lastName' | 'dateOfBirth' | 'gender'>
    >
  ): Promise<{ success: boolean; data: User }> {
    return apiClient.put('/auth/profile', fields);
  }

  async updateSettings(settings: {
    notifications?: { email?: boolean; push?: boolean };
    dataSharing?: { enabled?: boolean };
  }): Promise<{ success: boolean; data: User['settings'] }> {
    return apiClient.put('/auth/settings', settings);
  }

  /**
   * Check if stored tokens are valid
   */
  hasValidTokens(): boolean {
    const accessToken = localStorage.getItem('authToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const tokenExpiry = localStorage.getItem('tokenExpiry');

    if (!accessToken || !refreshToken) {
      return false;
    }

    if (tokenExpiry) {
      const expiryTime = parseInt(tokenExpiry, 10);
      const now = Date.now();

      // Token is valid if not expired
      // Refresh token is valid for 7 days
      return expiryTime + 7 * 24 * 60 * 60 * 1000 > now;
    }

    return true;
  }

  /**
   * Get stored access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('authToken');
  }

  /**
   * Get stored refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Get stored user data
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr) as User;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Clear all auth data from storage
   */
  clearAuthData(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
  }
}

const authService = new AuthService();
export default authService;
