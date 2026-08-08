export type LogLevel = 'INFO' | 'ERROR' | 'WARNING' | 'DEBUG' | 'CRITICAL';
export type BackendType = 'sqlite' | 'elasticsearch' | 's3';

export interface LogEntry {
  id: string;
  timestamp: string; // ISO String
  level: LogLevel;
  service: string;
  message: string;
  metadata: Record<string, any>;
}

export interface LogFilters {
  query: string;
  level: LogLevel | 'ALL';
  service: string | 'ALL';
  startDate: string;
  endDate: string;
  backend?: BackendType | 'ALL';
}

export interface PaginationState {
  page: number;
  size: number;
  total: number;
}

// User and Workspace types
export interface User {
  id: string;
  username: string;
  api_key: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  api_key: string;
  owner_id: string;
  created_at: string;
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  oauth_token: string;
}

export interface StoredCredentials {
  user: User;
  oauth_token: string;
  workspaces: Workspace[];
}

