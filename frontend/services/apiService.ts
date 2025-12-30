import { LogEntry } from '../types';

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
}

export interface ServicesResponse {
  services: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }

    try {
      const response = await fetch(url.toString());

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

  async fetchLogs(params: FetchLogsParams & { project_id?: string }): Promise<LogsResponse> {
    // Convert date format from frontend to backend
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
    if (params.project_id) apiParams.project_id = params.project_id;

    return await this.request<LogsResponse>('/logs', apiParams);
  }

  async getServices(backend?: string): Promise<ServicesResponse> {
    const params: Record<string, any> = {};
    if (backend && backend !== 's3') params.backend = backend; // S3 doesn't have services endpoint yet

    if (backend === 's3') {
      // Return empty services for S3 for now
      return { services: [] };
    }

    return this.request<ServicesResponse>('/logs/services', params);
  }

  async ingestLog(logData: {
    message: string;
    level: string;
    service: string;
    timestamp?: string;
    metadata?: Record<string, any>;
  }): Promise<{ status: string; message: string; timestamp: string }> {
    const response = await fetch(`${this.baseUrl}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  async ingestLogsBatch(logs: Array<{
    message: string;
    level: string;
    service: string;
    timestamp?: string;
    metadata?: Record<string, any>;
  }>): Promise<{ status: string; message: string; queued: number; failed: number }> {
    const response = await fetch(`${this.baseUrl}/ingest/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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

// Export singleton instance
export const apiService = new ApiService();

// Export class for testing or custom instances
export { ApiService };