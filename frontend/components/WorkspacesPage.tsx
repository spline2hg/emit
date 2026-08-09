import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Workspace } from '../types';
import { Logo } from './Logo';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
import {
  Plus,
  Key,
  Copy,
  LogIn,
  AlertCircle,
  CheckCircle,
  X,
  User,
  FolderOpen,
} from 'lucide-react';

export const WorkspacesPage: React.FC = () => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApiModal, setShowApiModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [workspaceApiKey, setWorkspaceApiKey] = useState<string>('');
  const [loadingApiKey, setLoadingApiKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');

  const credentials = authService.getCredentials();

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    if (!credentials?.oauth_token) {
      navigate('/');
      return;
    }

    setLoading(true);
    try {
      const workspacesData = await authService.getWorkspaces(credentials.oauth_token);
      setWorkspaces(workspacesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!credentials?.oauth_token) {
      setError('Not authenticated');
      return;
    }

    try {
      await authService.createWorkspace({
        name: workspaceName,
        description: workspaceDescription || undefined,
        oauth_token: credentials.oauth_token,
      });

      setSuccess('Workspace created successfully!');
      setWorkspaceName('');
      setWorkspaceDescription('');
      setShowCreateModal(false);
      setTimeout(() => setSuccess(null), 3000);
      await loadWorkspaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    }
  };

  const handleViewLogs = (workspace: Workspace) => {
    navigate('/logs', { state: { workspace } });
  };

  const handleViewApiKeys = async (workspace: Workspace) => {
    setSelectedWorkspace(workspace);
    setShowApiModal(true);
    setLoadingApiKey(true);
    setWorkspaceApiKey('');

    try {
      const apiKey = await authService.getWorkspaceApiKey(workspace.id);
      setWorkspaceApiKey(apiKey);
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary"></div>
          <p className="text-sm">Loading workspaces…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Logo onClick={() => navigate('/')} />
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="size-4" />
              New workspace
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              title="Profile"
            >
              <User className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Toasts */}
      {error && (
        <div className="fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm dark:border-red-900 dark:bg-red-950/60 dark:text-red-300 animate-in slide-in-from-top">
          <AlertCircle className="mt-0.5 size-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="fixed right-4 top-4 z-50 flex max-w-sm items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 shadow-sm dark:border-green-900 dark:bg-green-950/60 dark:text-green-300 animate-in slide-in-from-top">
          <CheckCircle className="mt-0.5 size-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Main */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Workspaces</h1>
          <p className="mt-1 text-muted-foreground">
            Organize log streams by team, service or environment.
          </p>
        </div>

        {workspaces.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-secondary">
              <FolderOpen className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight">No workspaces yet</h3>
            <p className="mb-6 mt-1 max-w-sm text-sm text-muted-foreground">
              Create your first workspace to start organizing your logs.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="size-4" />
              Create workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                className="group flex flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold tracking-tight">
                      {workspace.name}
                    </h3>
                    {workspace.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {workspace.description}
                      </p>
                    )}
                  </div>
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                    <FolderOpen className="size-4" />
                  </div>
                </div>

                <p className="mb-4 flex-grow text-xs text-muted-foreground">
                  Created {new Date(workspace.created_at).toLocaleDateString()}
                </p>

                <div className="flex gap-2 border-t border-border pt-3">
                  <button
                    onClick={() => handleViewLogs(workspace)}
                    className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    <LogIn className="size-4" />
                    Logs
                  </button>
                  <button
                    onClick={() => handleViewApiKeys(workspace)}
                    className="inline-flex size-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    title="View API keys"
                  >
                    <Key className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreateModal(false)}>
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Create workspace</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkspace} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Workspace name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="My Awesome Workspace"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  value={workspaceDescription}
                  onChange={(e) => setWorkspaceDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="What is this workspace about?"
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-9 flex-1 rounded-md border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-9 flex-1 rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Create workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* API Keys Modal */}
      {showApiModal && selectedWorkspace && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowApiModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  <Key className="size-4" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">API credentials</h2>
                  <p className="text-sm text-muted-foreground">{selectedWorkspace.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowApiModal(false)}
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Workspace ID
                </label>
                <FieldShell onCopy={() => copyToClipboard(selectedWorkspace.id, 'workspace-id')} copied={copiedField === 'workspace-id'}>
                  {selectedWorkspace.id}
                </FieldShell>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  API key <span className="text-destructive">*</span>
                  <span className="ml-1 font-normal text-muted-foreground">
                    — for the X-API-Key header
                  </span>
                </label>
                {loadingApiKey ? (
                  <div className="flex items-center gap-2 rounded-lg border border-input bg-muted px-4 py-3 font-mono text-sm text-muted-foreground">
                    <div className="size-4 animate-spin rounded-full border-2 border-border border-t-primary"></div>
                    Generating API key…
                  </div>
                ) : (
                  <FieldShell onCopy={() => copyToClipboard(workspaceApiKey, 'api-key')} copied={copiedField === 'api-key'}>
                    {workspaceApiKey}
                  </FieldShell>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Format:{' '}
                  <code className="rounded bg-secondary px-1 py-0.5">raw_api_key:workspace_id</code>
                </p>
              </div>

              {!loadingApiKey && workspaceApiKey && (
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">Usage example</p>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `curl -X POST ${API_BASE_URL}/ingest \\
  -H "X-API-Key: ${workspaceApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Test log", "level": "INFO", "service": "my-service"}'`,
                          'curl-command'
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {copiedField === 'curl-command' ? (
                        <CheckCircle className="size-3.5" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {copiedField === 'curl-command' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded-md bg-background p-3 font-mono text-xs leading-relaxed text-foreground">
{`curl -X POST ${API_BASE_URL}/ingest \\
  -H "X-API-Key: ${workspaceApiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Test log",
    "level": "INFO",
    "service": "my-service"
  }'`}
                  </pre>
                </div>
              )}

              <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
                <AlertCircle className="mt-0.5 size-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="text-sm text-amber-800 dark:text-amber-300">
                  <p className="mb-1 font-medium">Keep your API keys secure!</p>
                  <p className="text-xs">
                    Never share your API keys publicly. Store them securely and use
                    environment variables in production.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-5">
              <button
                onClick={() => setShowApiModal(false)}
                className="h-9 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FieldShell: React.FC<{ onCopy: () => void; copied: boolean; children: React.ReactNode }> = ({
  onCopy,
  copied,
  children,
}) => (
  <div className="relative">
    <div className="break-all rounded-lg border border-input bg-background px-4 py-3 pr-24 font-mono text-sm text-foreground">
      {children}
    </div>
    <button
      onClick={onCopy}
      className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
    >
      {copied ? <CheckCircle className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  </div>
);

