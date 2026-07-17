import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { User } from '../types';
import authService from '../services/auth/authService';
import i18n from '../i18n';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  login: (accessToken: string, refreshToken: string, user: User) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// Token expiration check (in milliseconds)
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // Auto logout after 30 minutes of inactivity

// 登录/刷新资料后，若用户偏好语言与当前不同且未手动覆盖，则切换 (L-P5)
function applyUserLanguage(user: User | null): void {
  const lang = user?.settings?.language;
  const manualOverride = localStorage.getItem('lang');
  if (lang && !manualOverride && lang !== i18n.language) {
    void i18n.changeLanguage(lang);
  }
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refs for managing intervals and timeouts
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  // Perform logout
  const performLogout = useCallback(async () => {
    try {
      // Call logout API if user is authenticated
      if (accessToken) {
        await authService.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear state and storage
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      localStorage.removeItem('tokenExpiry');
      clearTimers();
    }
  }, [accessToken, clearTimers]);

  // Update activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Reset inactivity timeout
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }

    if (accessToken) {
      inactivityTimeoutRef.current = setTimeout(() => {
        console.log('Auto logout due to inactivity');
        performLogout();
      }, INACTIVITY_TIMEOUT);
    }
  }, [accessToken, performLogout]);

  // Setup activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];

    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [updateActivity]);

  // Refresh access token
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const currentRefreshToken = localStorage.getItem('refreshToken');

    if (!currentRefreshToken) {
      performLogout();
      return false;
    }

    try {
      const response = await authService.refreshToken(currentRefreshToken);

      if (response.success && response.data) {
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
          response.data;

        setAccessToken(newAccessToken);
        setRefreshToken(newRefreshToken);
        localStorage.setItem('authToken', newAccessToken);
        localStorage.setItem('refreshToken', newRefreshToken);

        // Set token expiry (15 minutes from now)
        const expiryTime = Date.now() + 15 * 60 * 1000;
        localStorage.setItem('tokenExpiry', expiryTime.toString());

        return true;
      }

      performLogout();
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      performLogout();
      return false;
    }
  }, [performLogout]);

  // Setup token refresh interval
  const setupTokenRefresh = useCallback(() => {
    clearTimers();

    // Check token every minute
    refreshIntervalRef.current = setInterval(() => {
      const tokenExpiry = localStorage.getItem('tokenExpiry');

      if (tokenExpiry) {
        const expiryTime = parseInt(tokenExpiry, 10);
        const now = Date.now();

        // Refresh if token will expire in less than 5 minutes
        if (expiryTime - now < TOKEN_REFRESH_THRESHOLD) {
          refreshAccessToken();
        }
      }
    }, 60 * 1000); // Check every minute
  }, [clearTimers, refreshAccessToken]);

  // Login function
  const login = useCallback(
    (newAccessToken: string, newRefreshToken: string, newUser: User) => {
      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
      setUser(newUser);
      applyUserLanguage(newUser);

      localStorage.setItem('authToken', newAccessToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      localStorage.setItem('user', JSON.stringify(newUser));

      // Set token expiry (15 minutes from now)
      const expiryTime = Date.now() + 15 * 60 * 1000;
      localStorage.setItem('tokenExpiry', expiryTime.toString());

      setupTokenRefresh();
      updateActivity();
    },
    [setupTokenRefresh, updateActivity]
  );

  // Logout function
  const logout = useCallback(async () => {
    await performLogout();
  }, [performLogout]);

  // Check for stored auth data on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedAccessToken = localStorage.getItem('authToken');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');
      const tokenExpiry = localStorage.getItem('tokenExpiry');

      try {
        if (storedAccessToken && storedRefreshToken && storedUser) {
          // Check if token is still valid
          if (tokenExpiry) {
            const expiryTime = parseInt(tokenExpiry, 10);
            const now = Date.now();

            if (expiryTime > now) {
              // Token is still valid
              setAccessToken(storedAccessToken);
              setRefreshToken(storedRefreshToken);
              setUser(JSON.parse(storedUser));
              setupTokenRefresh();
              updateActivity();
            } else if (expiryTime + 7 * 24 * 60 * 60 * 1000 > now) {
              // Refresh token might still be valid (7 day expiry), try to refresh
              const refreshed = await refreshAccessToken();
              if (refreshed) {
                setUser(JSON.parse(storedUser));
                setupTokenRefresh();
                updateActivity();
              }
            } else {
              // Both tokens expired
              performLogout();
            }
          } else {
            // No expiry info, try to refresh
            const refreshed = await refreshAccessToken();
            if (refreshed) {
              setUser(JSON.parse(storedUser));
              setupTokenRefresh();
              updateActivity();
            }
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        performLogout();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [performLogout, refreshAccessToken, setupTokenRefresh, updateActivity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getProfile();
      if (response.success) {
        setUser(response.data);
        applyUserLanguage(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
      }
    } catch {
      // silently fail — user state remains unchanged
    }
  }, []);

  const value = {
    user,
    accessToken,
    login,
    logout,
    refreshAccessToken,
    refreshUser,
    isAuthenticated: !!accessToken,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
