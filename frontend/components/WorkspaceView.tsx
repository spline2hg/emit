import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { Workspace } from '../types';
import { ArrowLeft, Copy, Check, Key, RefreshCw, Eye, EyeOff, Shield, AlertTriangle, Loader2, FolderOpen, Activity } from 'lucide-react';
import LogsExplorer from './LogsExplorer';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../services/config';

type Tab = 'overview' | 'logs' | 'settings';

const maskKey = (key: string) => {
  if (!key || key === 'undefined') return '*****';
  if (key.length <= 8) return key;
  return key.substring(0, 8) + '*'.repeat(Math.min(key.length - 8, 24));
};

const WorkspaceView: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const [apiKey, setApiKey] = useState<string>('');
  const [loadingApiKey, setLoadingApiKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [rotating, setRotating] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const loadWorkspace = useCallback(async () => {
    const token = authService.getOAuthToken();
    if (!token || !id) {
      navigate('/workspaces');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await authService.getWorkspaces(token);
      const found = data.find((ws) => ws.id === id);
      if (!found) {
        navigate('/workspaces');
        return;
      }
      setWorkspace(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (user) loadWorkspace();
  }, [user, loadWorkspace]);

  const loadApiKey = useCallback(async () => {
    if (!id) return;
    setLoadingApiKey(true);
    try {
      const key = await authService.getWorkspaceApiKey(id);
      setApiKey(key);
    } catch (err) {
      console.error('Failed to fetch API key', err);
    } finally {
      setLoadingApiKey(false);
    }
  }, [id]);

  useEffect(() => {
    if ((activeTab === 'settings' || activeTab === 'logs') && !apiKey) loadApiKey();
  }, [activeTab, apiKey, loadApiKey]);

  const handleRotate = async () => {
    if (!id) return;
    setRotating(true);
    try {
      const newKey = await authService.rotateWorkspaceApiKey(id);
      setApiKey(newKey);
      setShowRotateConfirm(false);
      setShowKey(false);
    } catch (err) {
      console.error('Failed to rotate API key', err);
      setError(err instanceof Error ? err.message : 'Failed to rotate API key');
    } finally {
      setRotating(false);
    }
  };

  const handleBack = () => {
    navigate('/workspaces');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
          <span className="text-sm">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <span className="text-lg text-destructive">!</span>
          </div>
          <div>
            <h2 className="mb-1 text-sm font-medium">Something went wrong</h2>
            <p className="text-xs text-muted-foreground">{error || 'Workspace not found'}</p>
          </div>
          <button onClick={handleBack} className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Back to workspaces
          </button>
        </div>
      </div>
    );
  }

  const curlExample = `curl -X POST ${BACKEND_URL}/ingest \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Test log",
    "level": "INFO",
    "service": "my-service"
  }'`;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'logs', label: 'Logs' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="flex flex-col">
      {/* Workspace header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            title="Back to workspaces"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
              <FolderOpen size={16} />
            </span>
            <h1 className="truncate text-xl font-semibold tracking-tight">{workspace.name}</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="animate-in slide-in-from-top">
        {activeTab === 'overview' && (
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Workspace info */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-3">
                <Activity size={18} className="text-muted-foreground" />
                <h3 className="text-base font-semibold">Workspace Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">Name</label>
                  <div className="rounded-md border border-input bg-background px-3 py-2 text-sm">{workspace.name}</div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">Workspace ID</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 overflow-hidden rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground text-ellipsis whitespace-nowrap">
                      {workspace.id}
                    </code>
                    <button
                      onClick={() => copyToClipboard(workspace.id, 'ws-id')}
                      className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      title="Copy Workspace ID"
                    >
                      {copiedField === 'ws-id' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">Created</label>
                  <div className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {workspace.created_at ? new Date(workspace.created_at).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
                {workspace.description && (
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">Description</label>
                    <div className="rounded-md border border-input bg-background px-3 py-2 text-sm">{workspace.description}</div>
                  </div>
                )}
              </div>
            </div>

            {/* API key summary */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key size={18} className="text-muted-foreground" />
                  <h3 className="text-base font-semibold">API Credentials</h3>
                </div>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Manage →
                </button>
              </div>
              {loadingApiKey ? (
                <div className="rounded-md border border-input bg-background p-4 text-sm text-muted-foreground">Loading API key...</div>
              ) : apiKey ? (
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-hidden rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground text-ellipsis whitespace-nowrap">
                    {maskKey(apiKey)}
                  </code>
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title={showKey ? 'Hide API Key' : 'Show API Key'}
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Failed to load API key.</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <LogsExplorer apiKey={apiKey} />
        )}

        {activeTab === 'settings' && (
          <div className="grid gap-6">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-3">
                <Shield size={18} className="text-muted-foreground" />
                <h3 className="text-base font-semibold">Workspace Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">Name</label>
                  <div className="rounded-md border border-input bg-background px-3 py-2 text-sm">{workspace.name}</div>
                </div>
                {workspace.description && (
                  <div>
                    <label className="mb-2 block text-xs font-medium text-muted-foreground">Description</label>
                    <div className="rounded-md border border-input bg-background px-3 py-2 text-sm">{workspace.description}</div>
                  </div>
                )}
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">Workspace ID</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 overflow-hidden rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground text-ellipsis whitespace-nowrap">
                      {workspace.id}
                    </code>
                    <button
                      onClick={() => copyToClipboard(workspace.id, 'id-ws-id')}
                      className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      title="Copy Workspace ID"
                    >
                      {copiedField === 'id-ws-id' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">Created</label>
                  <div className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                    {workspace.created_at ? new Date(workspace.created_at).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-5 flex items-center gap-3">
                <Key size={18} className="text-muted-foreground" />
                <h3 className="text-base font-semibold">API Credentials</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-muted-foreground">
                    API Key <span className="ml-1 font-normal">— for the X-API-Key header</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 overflow-hidden rounded-md border border-input bg-background px-3 py-2 font-mono text-xs text-foreground text-ellipsis whitespace-nowrap">
                      {loadingApiKey ? 'Loading...' : showKey ? apiKey : maskKey(apiKey)}
                    </code>
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      title={showKey ? 'Hide API Key' : 'Show API Key'}
                      disabled={loadingApiKey || !apiKey}
                    >
                      {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(apiKey, 'api-key')}
                      className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      title="Copy API Key"
                      disabled={loadingApiKey || !apiKey}
                    >
                      {copiedField === 'api-key' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Format: <code className="rounded bg-secondary px-1 py-0.5">api_key</code>
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowRotateConfirm(true)}
                    disabled={!apiKey}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw size={14} />
                    Regenerate API Key
                  </button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Regenerating will invalidate the current key.
                  </p>
                </div>
              </div>
            </div>

            {/* Usage */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-3">
                <AlertTriangle size={18} className="text-muted-foreground" />
                <h3 className="text-base font-semibold">Usage Instructions</h3>
              </div>
              {loadingApiKey ? (
                <div className="rounded-md border border-input bg-background p-4 text-center text-sm text-muted-foreground">Loading credentials...</div>
              ) : apiKey ? (
                <div>
                  <pre className="overflow-x-auto rounded-md border border-border bg-background p-4 font-mono text-xs leading-relaxed text-foreground">
{`curl -X POST ${BACKEND_URL}/ingest \\
  -H "X-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Test log",
    "level": "INFO",
    "service": "my-service"
  }'`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(curlExample, 'curl')}
                    className="mt-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {copiedField === 'curl' ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    {copiedField === 'curl' ? 'Copied' : 'Copy command'}
                  </button>
                </div>
              ) : (
                <div className="rounded-md border border-input bg-background p-4 text-center text-sm text-muted-foreground">Failed to load credentials</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Rotate confirm modal */}
      {showRotateConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold tracking-tight">Regenerate API Key</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Are you sure you want to regenerate the API key? This action will invalidate the current key and any applications using it will stop working.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRotateConfirm(false)}
                className="h-9 rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleRotate}
                disabled={rotating}
                className="h-9 rounded-md bg-destructive px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
              >
                {rotating ? 'Regenerating...' : 'Regenerate Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkspaceView;