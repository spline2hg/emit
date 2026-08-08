import { User, Workspace, CreateWorkspaceRequest, StoredCredentials } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const STORAGE_KEY = 'logstream_credentials';

class AuthService {
  private baseUrl: string;
  private credentials: StoredCredentials | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.loadCredentials();
  }

  // Storage Management
  private loadCredentials(): void {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.credentials = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored credentials:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  private saveCredentials(credentials: StoredCredentials): void {
    this.credentials = credentials;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
  }

  public clearCredentials(): void {
    this.credentials = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  public getCredentials(): StoredCredentials | null {
    return this.credentials;
  }

  public getOAuthToken(): string | null {
    return this.credentials?.oauth_token || null;
  }

  public isAuthenticated(): boolean {
    return this.credentials !== null;
  }

  // API Calls
  async registerUser(): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const userData = await response.json();

    const user: User = {
      id: userData.id,
      username: userData.username,
      api_key: userData.api_key,
    };

    // Store credentials
    this.saveCredentials({
      user,
      oauth_token: userData.api_key, // Using api_key as oauth_token for now
      workspaces: [],
    });

    return user;
  }

  async createWorkspace(workspaceData: CreateWorkspaceRequest): Promise<Workspace> {
    const response = await fetch(`${this.baseUrl}/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workspaceData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    const workspace: Workspace = {
      id: data.id,
      name: data.name,
      description: data.description,
      api_key: data.api_key,
      owner_id: data.owner_id,
      created_at: data.created_at,
    };

    // Add to stored credentials
    if (this.credentials) {
      this.credentials.workspaces.push(workspace);
      this.saveCredentials(this.credentials);
    }

    return workspace;
  }

  async getWorkspaces(oauthToken: string): Promise<Workspace[]> {
    const response = await fetch(`${this.baseUrl}/workspaces?oauth_token=${encodeURIComponent(oauthToken)}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Update stored credentials
    if (this.credentials) {
      this.credentials.workspaces = data.workspaces;
      this.saveCredentials(this.credentials);
    }

    return data.workspaces;
  }

  async getWorkspaceApiKey(workspaceId: string): Promise<string> {
    if (!this.credentials?.oauth_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${this.baseUrl}/workspaces/${workspaceId}/api-key?oauth_token=${encodeURIComponent(this.credentials.oauth_token)}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.api_key;
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export class for testing or custom instances
export { AuthService };
