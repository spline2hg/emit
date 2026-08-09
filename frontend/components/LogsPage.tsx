import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import LogsExplorer from './LogsExplorer';
import { Workspace } from '../types';
import { FolderOpen, Plus, Loader2 } from 'lucide-react';

const LogsPage: React.FC = () => {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = authService.getOAuthToken();
    if (!token) {
      navigate('/workspaces');
      return;
    }

    (async () => {
      try {
        const list = await authService.getWorkspaces(token);
        setWorkspaces(list);
        if (list.length > 0) setSelectedId(list[0].id);
      } catch (error) {
        console.error('Failed to load workspaces', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  useEffect(() => {
    if (!selectedId) {
      setApiKey('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const key = await authService.getWorkspaceApiKey(selectedId);
        if (!cancelled) setApiKey(key);
      } catch (error) {
        console.error('Failed to load workspace key', error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[32px] font-semibold tracking-tight">Logs</h1>
        <p className="mt-1 text-muted-foreground">Search and filter across your log streams.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-muted-foreground" />
        </div>
      ) : workspaces.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card py-24 text-center">
          <FolderOpen size={36} className="opacity-40 text-muted-foreground" />
          <div>
            <p className="font-medium">No workspaces yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Create a workspace to start ingesting logs.</p>
          </div>
          <button
            onClick={() => navigate('/workspaces')}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus size={16} />
            Create workspace
          </button>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <label htmlFor="workspace-select" className="text-sm font-medium text-muted-foreground">
              Workspace
            </label>
            <select
              id="workspace-select"
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
          <LogsExplorer
            key={selectedId ?? 'none'}
            workspaceId={selectedId ?? undefined}
            workspaceKey={apiKey}
          />
        </>
      )}
    </div>
  );
};

export default LogsPage;