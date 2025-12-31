import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Project } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
import {
  FolderOpen,
  Plus,
  Key,
  Copy,
  Trash2,
  LogIn,
  AlertCircle,
  CheckCircle,
  X,
  User,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projectApiKey, setProjectApiKey] = useState<string>('');
  const [loadingApiKey, setLoadingApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form state
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  const credentials = authService.getCredentials();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    if (!credentials?.oauth_token) {
      navigate('/join');
      return;
    }

    setLoading(true);
    try {
      const projectsData = await authService.getProjects(credentials.oauth_token);
      setProjects(projectsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!credentials?.oauth_token) {
      setError('Not authenticated');
      return;
    }

    try {
      await authService.createProject({
        name: projectName,
        description: projectDescription || undefined,
        oauth_token: credentials.oauth_token,
      });

      setSuccess('Project created successfully!');
      setProjectName('');
      setProjectDescription('');
      setShowCreateModal(false);

      // Auto-dismiss success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);

      // Reload projects
      await loadProjects();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    }
  };

  const handleViewLogs = (project: Project) => {
    // Navigate to logs view with project context
    navigate('/logs', { state: { project } });
  };

  const handleViewApiKeys = async (project: Project) => {
    setSelectedProject(project);
    setShowApiModal(true);
    setLoadingApiKey(true);
    setProjectApiKey('');

    try {
      const apiKey = await authService.getProjectApiKey(project.id);
      setProjectApiKey(apiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch API key');
    } finally {
      setLoadingApiKey(false);
    }
  };

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleLogout = () => {
    authService.clearCredentials();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <header className="bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-4 hover:opacity-80 transition-opacity"
            >
              <div className="bg-brand-600 p-2 rounded-lg">
                <FolderOpen className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Emit</h1>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Project
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="Profile"
              >
                <User className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Toast Notifications */}
      {error && (
        <div className="fixed top-4 right-4 max-w-sm p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3 shadow-lg animate-in slide-in-from-top z-50">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="fixed top-4 right-4 max-w-sm p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3 shadow-lg animate-in slide-in-from-top z-50">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-800 dark:text-green-300">{success}</p>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {projects.length === 0 ? (
          <div className="text-center py-16">
            <FolderOpen className="h-16 w-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No projects yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create your first project to start organizing your logs
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-dark-border hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <div className="bg-brand-100 dark:bg-brand-900/30 p-2 rounded-lg">
                      <FolderOpen className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewLogs(project)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <LogIn className="h-4 w-4" />
                      View Logs
                    </button>
                    <button
                      onClick={() => handleViewApiKeys(project)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                      title="View API Keys"
                    >
                      <Key className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl max-w-md w-full border border-gray-200 dark:border-dark-border">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Project</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    required
                    maxLength={100}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    placeholder="My Awesome Project"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                    placeholder="What is this project about?"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Create Project
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* API Keys Modal */}
      {showApiModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]" onClick={() => setShowApiModal(false)}>
          <div className="bg-white dark:bg-dark-surface rounded-xl shadow-xl max-w-2xl w-full border border-gray-200 dark:border-dark-border" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-brand-100 dark:bg-brand-900/30 p-2 rounded-lg">
                    <Key className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      API Credentials
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedProject.name}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowApiModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Project ID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Project ID
                  </label>
                  <div className="relative">
                    <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 font-mono text-sm text-gray-800 dark:text-gray-200 break-all pr-24">
                      {selectedProject.id}
                    </div>
                    <button
                      onClick={() => copyToClipboard(selectedProject.id, 'project-id')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-1"
                    >
                      {copiedField === 'project-id' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    API Key (for X-API-Key header)
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  {loadingApiKey ? (
                    <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-brand-600"></div>
                      Generating API key...
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 font-mono text-sm text-gray-800 dark:text-gray-200 break-all pr-24">
                        {projectApiKey}
                      </div>
                      <button
                        onClick={() => copyToClipboard(projectApiKey, 'api-key')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-1"
                      >
                        {copiedField === 'api-key' ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Format: <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">raw_api_key:project_id</code>
                  </p>
                </div>

                {/* Usage Example */}
                {!loadingApiKey && projectApiKey && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                        Usage Example:
                      </p>
                      <button
                        onClick={() => copyToClipboard(
                          `curl -X POST ${API_BASE_URL}/ingest \\
  -H "X-API-Key: ${projectApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Test log", "level": "INFO", "service": "my-service"}'`,
                          'curl-command'
                        )}
                        className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-1"
                      >
                        {copiedField === 'curl-command' ? <CheckCircle className="h-3 w-3" /> : 'Copy'}
                      </button>
                    </div>
                    <pre className="text-xs text-blue-800 dark:text-blue-300 overflow-x-auto bg-white dark:bg-gray-900 rounded p-3">
{`curl -X POST ${API_BASE_URL}/ingest \\
  -H "X-API-Key: ${projectApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Test log",
    "level": "INFO",
    "service": "my-service"
  }'`}
                    </pre>
                  </div>
                )}

                {/* Warning */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-300">
                    <p className="font-medium mb-1">Keep your API keys secure!</p>
                    <p className="text-xs">
                      Never share your API keys publicly. Store them securely and use environment variables in production.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowApiModal(false)}
                  className="w-full px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
