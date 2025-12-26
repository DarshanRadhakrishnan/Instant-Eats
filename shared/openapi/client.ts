/**
 * OpenAPI Service Client Generator
 * Creates type-safe HTTP clients based on OpenAPI specs
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface ServiceClientConfig {
  baseURL: string;
  serviceName: string;
  timeout?: number;
  retries?: number;
}

/**
 * Creates a typed service-to-service HTTP client
 * Replaces direct axios calls with service-aware client
 */
export class OpenAPIServiceClient {
  private client: AxiosInstance;
  private serviceName: string;

  constructor(config: ServiceClientConfig) {
    this.serviceName = config.serviceName;
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Name': this.serviceName,
      },
    });

    // Add retry logic
    this.setupRetries(config.retries || 3);
  }

  private setupRetries(retries: number) {
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config as AxiosRequestConfig & { _retry?: number };
        config._retry = (config._retry || 0) + 1;

        // Retry on network errors or 5xx errors
        if (
          config._retry <= retries &&
          (error.response?.status >= 500 || !error.response)
        ) {
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, config._retry! - 1) * 1000)
          );
          return this.client(config);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Generic GET request
   */
  async get<T = any>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(path, config);
    return response.data;
  }

  /**
   * Generic POST request
   */
  async post<T = any>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(path, data, config);
    return response.data;
  }

  /**
   * Generic PUT request
   */
  async put<T = any>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(path, data, config);
    return response.data;
  }

  /**
   * Generic PATCH request
   */
  async patch<T = any>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(path, data, config);
    return response.data;
  }

  /**
   * Generic DELETE request
   */
  async delete<T = any>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(path, config);
    return response.data;
  }

  /**
   * Set authorization header
   */
  setAuthToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Set custom headers
   */
  setHeaders(headers: Record<string, string>) {
    Object.assign(this.client.defaults.headers.common, headers);
  }

  /**
   * Get raw axios client for advanced operations
   */
  getRawClient(): AxiosInstance {
    return this.client;
  }
}

/**
 * Service client factory for creating multiple clients
 */
export class ServiceClientFactory {
  private clients: Map<string, OpenAPIServiceClient> = new Map();

  createClient(config: ServiceClientConfig): OpenAPIServiceClient {
    const key = config.serviceName;
    if (!this.clients.has(key)) {
      this.clients.set(key, new OpenAPIServiceClient(config));
    }
    return this.clients.get(key)!;
  }

  getClient(serviceName: string): OpenAPIServiceClient | undefined {
    return this.clients.get(serviceName);
  }

  getAllClients(): Map<string, OpenAPIServiceClient> {
    return this.clients;
  }
}

// Global factory instance
export const serviceClientFactory = new ServiceClientFactory();
