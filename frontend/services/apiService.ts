import { LogEntry } from '../types';
import { BACKEND_URL } from './config';

export interface FetchLogsParams {
  page: number;
  size: number;
  search?: string;
  level?: string;
  service?: string;
  startDate?: string;
  endDate?: string;
  backend?: string;
}

export interface LogsResponse {
  logs: LogEntry[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
  workspace_id: string;
}

export interface ServicesResponse {
  services: string[];
  workspace_id: string;
}

export interface StorageBackendsResponse {
  backends: string[];
  default_backend: string;
}

const API_BASE_URL = BACKEND_URL;

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    params?: Record<string, any>,
    apiKey?: string,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }

    try {
      const response = await fetch(url.toString(), {
        headers: apiKey ? { 'X-API-Key': apiKey } : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  async getStorageBackends(apiKey: string): Promise<StorageBackendsResponse> {
    return this.request<StorageBackendsResponse>('/logs/backends', undefined, apiKey);
  }

  async fetchLogs(params: FetchLogsParams, apiKey: string): Promise<LogsResponse> {
    const apiParams: Record<string, any> = {
      page: params.page,
      size: params.size,
    };

    if (params.search) apiParams.search = params.search;
    if (params.level && params.level !== 'ALL') apiParams.level = params.level;
    if (params.service && params.service !== 'ALL') apiParams.service = params.service;
    if (params.startDate) apiParams.from_ts = params.startDate;
    if (params.endDate) apiParams.to_ts = params.endDate;
    if (params.backend) apiParams.backend = params.backend;

    return this.request<LogsResponse>('/logs', apiParams, apiKey);
  }

  async getServices(backend: string | undefined, apiKey: string): Promise<ServicesResponse> {
    const params: Record<string, any> = {};
    if (backend && backend !== 's3') params.backend = backend;

    if (backend === 's3') {
      return { services: [], workspace_id: '' };
    }

    return this.request<ServicesResponse>('/logs/services', params, apiKey);
  }

  async ingestLog(
    logData: {
      message: string;
      level: string;
      service: string;
      timestamp?: string;
      metadata?: Record<string, any>;
    },
    apiKey: string,
  ): Promise<{ status: string; message: string; timestamp: string }> {
    const response = await fetch(`${this.baseUrl}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(logData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async ingestLogsBatch(
    logs: Array<{
      message: string;
      level: string;
      service: string;
      timestamp?: string;
      metadata?: Record<string, any>;
    }>,
    apiKey: string,
  ): Promise<{ status: string; message: string; queued: number; failed: number }> {
    const response = await fetch(`${this.baseUrl}/ingest/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(logs),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}

export const apiService = new ApiService();
export { ApiService };
