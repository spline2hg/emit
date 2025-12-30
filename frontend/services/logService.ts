import { LogEntry, LogLevel } from '../types';
import { apiService, FetchLogsParams } from './apiService';

// Use real API service - keeping the same interface for compatibility
export const fetchLogs = async (params: FetchLogsParams & { project_id?: string }): Promise<{ data: LogEntry[], total: number }> => {
  try {
    const response = await apiService.fetchLogs(params);
    return {
      data: response.logs,
      total: response.total
    };
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    throw error;
  }
};

// Helper to get available services from API
export const getServices = async (backend?: string): Promise<string[]> => {
  try {
    const response = await apiService.getServices(backend);
    return response.services;
  } catch (error) {
    console.error('Failed to fetch services:', error);
    throw error;
  }
};

// Helper to ingest a single log
export const ingestLog = async (logData: {
  message: string;
  level: string;
  service: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}) => {
  try {
    return await apiService.ingestLog(logData);
  } catch (error) {
    console.error('Failed to ingest log:', error);
    throw error;
  }
};

// Helper to ingest logs in batch
export const ingestLogsBatch = async (logs: Array<{
  message: string;
  level: string;
  service: string;
  timestamp?: string;
  metadata?: Record<string, any>;
}>) => {
  try {
    return await apiService.ingestLogsBatch(logs);
  } catch (error) {
    console.error('Failed to ingest logs batch:', error);
    throw error;
  }
};

// Re-export the types for backward compatibility
export type { FetchLogsParams };

