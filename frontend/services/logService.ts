import { LogEntry } from '../types';
import { apiService, FetchLogsParams } from './apiService';

export const fetchLogs = async (
  params: FetchLogsParams,
  apiKey: string,
): Promise<{ data: LogEntry[]; total: number }> => {
  try {
    const response = await apiService.fetchLogs(params, apiKey);
    return {
      data: response.logs,
      total: response.total,
    };
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    throw error;
  }
};

export const getServices = async (
  backend: string | undefined,
  apiKey: string,
): Promise<string[]> => {
  try {
    const response = await apiService.getServices(backend, apiKey);
    return response.services;
  } catch (error) {
    console.error('Failed to fetch services:', error);
    throw error;
  }
};

export const ingestLog = async (
  logData: {
    message: string;
    level: string;
    service: string;
    timestamp?: string;
    metadata?: Record<string, any>;
  },
  apiKey: string,
) => {
  try {
    return await apiService.ingestLog(logData, apiKey);
  } catch (error) {
    console.error('Failed to ingest log:', error);
    throw error;
  }
};

export const ingestLogsBatch = async (
  logs: Array<{
    message: string;
    level: string;
    service: string;
    timestamp?: string;
    metadata?: Record<string, any>;
  }>,
  apiKey: string,
) => {
  try {
    return await apiService.ingestLogsBatch(logs, apiKey);
  } catch (error) {
    console.error('Failed to ingest logs batch:', error);
    throw error;
  }
};

export type { FetchLogsParams };
