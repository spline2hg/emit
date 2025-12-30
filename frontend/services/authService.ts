import { User, Project, CreateProjectRequest, StoredCredentials } from '../types';

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
    const response = await fetch(`${this.baseUrl}/join`, {
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
      projects: [],
    });

    return user;
  }

  async createProject(projectData: CreateProjectRequest): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(projectData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const projectDataResponse = await response.json();

    const project: Project = {
      id: projectDataResponse.id,
      name: projectDataResponse.name,
      description: projectDataResponse.description,
      api_key: projectDataResponse.api_key,
      owner_id: projectDataResponse.owner_id,
      created_at: projectDataResponse.created_at,
    };

    // Add to stored credentials
    if (this.credentials) {
      this.credentials.projects.push(project);
      this.saveCredentials(this.credentials);
    }

    return project;
  }

  async getProjects(oauthToken: string): Promise<Project[]> {
    const response = await fetch(`${this.baseUrl}/projects?oauth_token=${encodeURIComponent(oauthToken)}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Update stored credentials
    if (this.credentials) {
      this.credentials.projects = data.projects;
      this.saveCredentials(this.credentials);
    }

    return data.projects;
  }

  async getProjectApiKey(projectId: string): Promise<string> {
    if (!this.credentials?.oauth_token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${this.baseUrl}/projects/${projectId}/api-key?oauth_token=${encodeURIComponent(this.credentials.oauth_token)}`
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
