/**
 * 公开 API 客户端 — 用于 viewer 页面
 *
 * 关键差异：不挂任何拦截器，绝不带 Authorization header
 * （避免登录用户在打开 /share/:token 时把自己的 JWT 误带过去）。
 */
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosError,
  AxiosResponse,
} from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export class PublicApiError extends Error {
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
    this.name = 'PublicApiError';
  }
}

class PublicApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
    });
    // 一个简单 response 拦截器，把 axios error 标准化成 PublicApiError
    this.client.interceptors.response.use(
      r => r,
      (error: AxiosError) => this.handleError(error)
    );
  }

  private handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      const { status, data } = error.response as AxiosResponse<any>;
      throw new PublicApiError(status, data?.message || 'Error', data?.errors);
    }
    if (error.request) {
      throw new PublicApiError(0, 'Network error');
    }
    throw new PublicApiError(0, error.message || 'Unexpected error');
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const r: AxiosResponse<T> = await this.client.get(url, config);
    return r.data;
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const r: AxiosResponse<T> = await this.client.post(url, data, config);
    return r.data;
  }
}

const publicApiClient = new PublicApiClient();
export default publicApiClient;
