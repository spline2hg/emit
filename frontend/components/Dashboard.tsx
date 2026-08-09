import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Workspace } from '../types';
import { Plus, Search, FolderOpen, ChevronRight, X, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');

  const loadWorkspaces = useCallback(async () => {
    if (!user?.api_key) return;
    const token = authService.getOAuthToken();
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const data = await authService.getWorkspaces(token);
      setWorkspaces(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
    } finally {
      setLoading(false);
    }
  }, [user?.api_key]);

  useEffect(() => {
    if (user) loadWorkspaces();
  }, [user, loadWorkspaces]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    const token = authService.getOAuthToken();
    if (!token) return;

    setIsCreating(true);
    setError(null);
    try {
      await authService.createWorkspace({
        name: workspaceName.trim(),
        description: workspaceDescription.trim() || undefined,
        oauth_token: token,
      });
      setWorkspaceName('');
      setWorkspaceDescription('');
      setShowCreateModal(false);
      await loadWorkspaces();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredWorkspaces = workspaces.filter((ws) =>
    ws.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectWorkspace = (id: string) => {
    navigate(`/workspaces/${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
          <span className="text-sm">Loading workspaces...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <span className="text-lg text-destructive">!</span>
          </div>
          <div>
            <h2 className="mb-1 text-sm font-medium">Something went wrong</h2>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          <button onClick={() => window.location.reload()} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-top">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-[32px] font-semibold tracking-tight">Workspaces</h1>
          <p className="mt-1 text-muted-foreground">Organize log streams by team, service or environment.</p>
        </div>
        <div className="hidden text-right sm:block">
          <div className="mb-1 text-[13px] font-medium text-muted-foreground">Total Workspaces</div>
          <div className="font-mono text-2xl">{workspaces.length}</div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:w-auto"
        >
          <Plus size={16} />
          Create Workspace
        </button>
      </div>

      {/* Workspaces List */}
      {filteredWorkspaces.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-card py-20 text-center">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-secondary">
            <FolderOpen className="size-5 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium">
            {workspaces.length === 0 ? 'No workspaces yet' : 'No matching workspaces'}
          </h3>
          <p className="mb-6 mt-1 max-w-sm text-sm text-muted-foreground">
            {workspaces.length === 0
              ? 'Create your first workspace to start organizing your logs.'
              : 'Try adjusting your search query.'}
          </p>
          {workspaces.length === 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus size={16} />
              Create Workspace
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="divide-y divide-border">
            {filteredWorkspaces.map((ws) => (
              <div
                key={ws.id}
                onClick={() => handleSelectWorkspace(ws.id)}
                className="group flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-accent/40 sm:p-5"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground transition-colors group-hover:text-foreground">
                    <FolderOpen size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium transition-colors">{ws.name}</h3>
                    <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                      {ws.description || `Created ${new Date(ws.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-8 sm:gap-12">
                  <div className="hidden text-right sm:block">
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.073em] text-muted-foreground">Created</p>
                    <p className="font-mono text-sm">{new Date(ws.created_at).toLocaleDateString()}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground transition-colors group-hover:text-foreground" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 animate-in fade-in" onClick={() => setShowCreateModal(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight">Create New Workspace</h2>
              <button onClick={() => setShowCreateModal(false)} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">Name</label>
                <input
                  autoFocus
                  type="text"
                  required
                  maxLength={100}
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g. Production API"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Description</label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={workspaceDescription}
                  onChange={(e) => setWorkspaceDescription(e.target.value)}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="What is this workspace about?"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-9 rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !workspaceName.trim()}
                  className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;