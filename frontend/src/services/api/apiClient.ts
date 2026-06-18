import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import authService from '../auth/authService';

// API base URL - should be configured via environment variables
const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Custom API Error
 */
export class ApiError extends Error {
  public statusCode: number;
  public errors?: Record<string, string>;

  constructor(
    statusCode: number,
    message: string,
    errors?: Record<string, string>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = 'ApiError';
  }
}

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      config => {
        const token = localStorage.getItem('authToken');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      response => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & {
          _retry?: boolean;
        };

        // If error is not 401 or request already retried, reject
        if (
          !originalRequest ||
          error.response?.status !== 401 ||
          originalRequest._retry
        ) {
          return this.handleError(error);
        }

        // Try to refresh token
        if (!this.isRefreshing) {
          this.isRefreshing = true;
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            const response = await authService.refreshToken(refreshToken);

            if (response.success && response.data) {
              const { accessToken, refreshToken: newRefreshToken } =
                response.data;

              // Update stored tokens
              localStorage.setItem('authToken', accessToken);
              localStorage.setItem('refreshToken', newRefreshToken);

              // Update token expiry
              const expiryTime = Date.now() + 15 * 60 * 1000;
              localStorage.setItem('tokenExpiry', expiryTime.toString());

              // Notify all subscribers
              this.refreshSubscribers.forEach(callback =>
                callback(accessToken)
              );
              this.refreshSubscribers = [];

              // Retry original request
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              }
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, clear auth and redirect
            this.refreshSubscribers = [];
            authService.clearAuthData();
            window.location.href = '/login?expired=true';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        // If already refreshing, queue the request
        return new Promise(resolve => {
          this.refreshSubscribers.push((token: string) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            resolve(this.client(originalRequest));
          });
        });
      }
    );
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      const { status, data } = error.response as AxiosResponse<any>;
      const message = data?.message || 'An error occurred';
      const errors = data?.errors;

      // Handle specific error cases
      switch (status) {
        case 400:
          console.error('Bad Request:', message);
          break;
        case 401:
          // Unauthorized - will be handled by interceptor for token refresh
          // If we get here, token refresh failed or was not attempted
          console.error('Unauthorized:', message);
          break;
        case 403:
          console.error('Forbidden:', message);
          break;
        case 404:
          console.error('Not Found:', message);
          break;
        case 409:
          console.error('Conflict:', message);
          break;
        case 422:
          console.error('Validation Error:', message, errors);
          break;
        case 500:
          console.error('Server Error:', message);
          break;
        default:
          console.error(`Error ${status}:`, message);
      }

      throw new ApiError(status, message, errors);
    } else if (error.request) {
      // Network error
      console.error('Network Error:', error.message);
      throw new ApiError(0, 'Network error. Please check your connection.');
    } else {
      // Something else happened
      console.error('Error:', error.message);
      throw new ApiError(0, error.message || 'An unexpected error occurred');
    }
  }

  /**
   * Make GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  /**
   * Make POST request
   */
  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(
      url,
      data,
      config
    );
    return response.data;
  }

  /**
   * Make PUT request
   */
  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  /**
   * Make PATCH request
   */
  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(
      url,
      data,
      config
    );
    return response.data;
  }

  /**
   * Make DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }

  /**
   * Download a file as Blob via GET (auth headers + refresh interceptor still apply)
   */
  async download(url: string, config?: AxiosRequestConfig): Promise<Blob> {
    const response = await this.client.get<Blob>(url, {
      ...config,
      responseType: 'blob',
    });
    return response.data;
  }
}

const apiClient = new ApiClient();
export default apiClient;
