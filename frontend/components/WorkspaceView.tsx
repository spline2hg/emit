import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { authService } from '../services/authService';
import { apiService } from '../services/apiService';
import { Workspace } from '../types';
import {
  Copy,
  Check,
  Key,
  RefreshCw,
  Eye,
  EyeOff,
  Shield,
  Loader2,
  FolderOpen,
  Activity,
  Info,
  AlertTriangle,
  XCircle,
  Database,
} from 'lucide-react';
import LogsExplorer from './LogsExplorer';
import ChatPanel from './ChatPanel';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../services/config';

type Tab = 'overview' | 'logs' | 'chat' | 'settings';

const maskKey = (key: string) => {
  if (!key) return '*****';
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

  const [stats, setStats] = useState<{
    total: number;
    info: number;
    warning: number;
    error: number;
  } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

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
  }, [id, navigate]);

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
    if (id && !apiKey) loadApiKey();
  }, [id, apiKey, loadApiKey]);

  const loadStats = useCallback(async () => {
    if (!apiKey) return;
    setLoadingStats(true);
    try {
      const levelCounts = ['ALL', 'INFO', 'WARNING', 'ERROR'] as const;
      const [total, info, warning, error] = await Promise.all(
        levelCounts.map((level) =>
          apiService.fetchLogs({ page: 1, size: 1, level: level as string }, apiKey),
        ),
      );
      setStats({ total: total.total, info: info.total, warning: warning.total, error: error.total });
    } catch (err) {
      console.error('Failed to fetch stats', err);
      setStats(null);
    } finally {
      setLoadingStats(false);
    }
  }, [apiKey]);

  useEffect(() => {
    if (activeTab === 'overview' && apiKey) loadStats();
  }, [activeTab, apiKey, loadStats]);

  const handleRotate = async () => {
    if (!id) return;
    setRotating(true);
    try {
      const newKey = await authService.rotateWorkspaceApiKey(id);
      setApiKey(newKey);
      setStats(null);
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

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'logs', label: 'Logs' },
    { id: 'chat', label: 'Chat' },
    { id: 'settings', label: 'Settings' },
  ];

  const curlExample = `curl -X POST ${BACKEND_URL}/ingest \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "Hello from my service",
    "level": "INFO",
    "service": "my-service"
  }'`;

  const statCards = [
    { label: 'Total logs', value: stats?.total ?? 0, icon: Database, tone: 'text-foreground' },
    { label: 'INFO', value: stats?.info ?? 0, icon: Info, tone: 'text-sky-400' },
    { label: 'Warnings', value: stats?.warning ?? 0, icon: AlertTriangle, tone: 'text-amber-400' },
    { label: 'Errors', value: stats?.error ?? 0, icon: XCircle, tone: 'text-red-400' },
  ];

  const checklist = [
    {
      icon: Activity,
      title: 'Browse your logs',
      desc: 'Inspect recent events and filter by level or service.',
      action: () => setActiveTab('logs'),
    },
    {
      icon: Key,
      title: 'Get your API key',
      desc: 'Reveal and copy the workspace credential in Settings.',
      action: () => setActiveTab('settings'),
    },
    {
      icon: RefreshCw,
      title: 'Rotate a key',
      desc: 'Regenerate instantly if a key is ever leaked.',
      action: () => setActiveTab('settings'),
    },
  ];

  return (
    <div
      className={
        activeTab === 'logs' || activeTab === 'chat'
          ? 'flex h-[calc(100vh-7rem)] min-h-[520px] flex-col gap-6'
          : 'flex flex-col gap-8'
      }
    >
      {/* Tabs */}
      <div className="flex shrink-0 gap-1 border-b border-border">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative -mb-px px-4 py-2.5 rounded-t-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-background text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="flex flex-col gap-8">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {statCards.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
                    <Icon size={16} className={stat.tone} />
                  </div>
                  <div className="font-mono text-2xl font-semibold tracking-tight text-foreground">
                    {loadingStats ? <Loader2 size={20} className="animate-spin text-muted-foreground" /> : stat.value.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Quick start */}
            <div className="rounded-xl border border-border bg-card lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                <h3 className="text-sm font-semibold">Quick start</h3>
                <span className="text-xs text-muted-foreground">Send your first log</span>
              </div>
              <div className="p-5">
                <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Endpoint:</span>
                  <code className="font-mono text-foreground">{BACKEND_URL}/ingest</code>
                </div>
                <div className="relative overflow-hidden rounded-lg border border-border bg-background">
                  <button
                    onClick={() => copyToClipboard(curlExample, 'quickstart-curl')}
                    className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="Copy example"
                  >
                    {copiedField === 'quickstart-curl' ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                    {copiedField === 'quickstart-curl' ? 'Copied' : 'Copy'}
                  </button>
                  <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed">
                    <code>
                      <span className="text-[#ff7b72]">curl -X POST </span>
                      <span className="text-[#a5d6ff]">{BACKEND_URL}/ingest</span>
                      <span className="text-[#8b949e]">\</span>
                      {'\n'}
                      <span className="text-[#79c0ff]">  -H </span>
                      <span className="text-[#ffa657]">&quot;X-API-Key: </span>
                      <span className="text-[#a5d6ff]">YOUR_API_KEY</span>
                      <span className="text-[#ffa657]">&quot;</span>
                      <span className="text-[#8b949e]"> \</span>
                      {'\n'}
                      <span className="text-[#79c0ff]">  -H </span>
                      <span className="text-[#a5d6ff]">&quot;Content-Type: application/json&quot;</span>
                      <span className="text-[#8b949e]"> \</span>
                      {'\n'}
                      <span className="text-[#79c0ff]">  -d </span>
                      <span className="text-[#c9d1d9]">&apos;{'{'}</span>
                      {'\n'}
                      <span className="text-[#d2a8ff]">    &quot;message&quot;: </span>
                      <span className="text-[#a5d6ff]">&quot;Hello from my service&quot;</span>
                      <span className="text-[#8b949e]">,</span>
                      {'\n'}
                      <span className="text-[#d2a8ff]">    &quot;level&quot;: </span>
                      <span className="text-[#a5d6ff]">&quot;INFO&quot;</span>
                      <span className="text-[#8b949e]">,</span>
                      {'\n'}
                      <span className="text-[#d2a8ff]">    &quot;service&quot;: </span>
                      <span className="text-[#a5d6ff]">&quot;my-service&quot;</span>
                      {'\n'}
                      <span className="text-[#c9d1d9]">  {'}'}&apos;</span>
                    </code>
                  </pre>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Replace <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">YOUR_API_KEY</code> with your key — get it in{' '}
                  <button onClick={() => setActiveTab('settings')} className="font-medium text-primary hover:underline">
                    Settings
                  </button>
                  .
                </p>
              </div>
            </div>

            {/* Checklist */}
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold">Next steps</h3>
              <div className="divide-y divide-border rounded-xl border border-border bg-card">
                {checklist.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.title}
                      onClick={item.action}
                      className="flex w-full gap-3 p-4 text-left transition-colors hover:bg-accent/40"
                    >
                      <Icon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
                      <div>
                        <h4 className="text-[13px] font-medium text-foreground">{item.title}</h4>
                        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs */}
      {activeTab === 'logs' && (
        <div className="min-h-0 flex-1">
          <LogsExplorer
            key={apiKey || 'no-key'}
            workspaceId={workspace.id}
            workspaceKey={apiKey}
          />
        </div>
      )}

      {/* Chat */}
      {activeTab === 'chat' && (
        <ChatPanel key={workspace.id} workspaceKey={apiKey} />
      )}

      {activeTab === 'settings' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Workspace info */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center gap-3">
              <FolderOpen size={18} className="text-muted-foreground" />
              <div>
                <h3 className="text-base font-semibold">Workspace information</h3>
                <p className="text-sm text-muted-foreground">Basic workspace details</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Name</label>
                <div className="rounded-md border border-input bg-background px-3 py-2 text-sm">{workspace.name}</div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Created</label>
                <div className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {workspace.created_at ? new Date(workspace.created_at).toLocaleDateString() : '—'}
                </div>
              </div>
              {workspace.description && (
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-muted-foreground">Description</label>
                  <div className="rounded-md border border-input bg-background px-3 py-2 text-sm">{workspace.description}</div>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-medium text-muted-foreground">Workspace ID</label>
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
            </div>
          </div>

          {/* API credentials */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-6 flex items-center gap-3">
              <Key size={18} className="text-muted-foreground" />
              <div>
                <h3 className="text-base font-semibold">API credentials</h3>
                <p className="text-sm text-muted-foreground">Sent as the X-API-Key header</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-muted-foreground">API Key</label>
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
                <div className="mt-2 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
                  <Shield size={14} className="shrink-0" />
                  <span>
                    Every request must include <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">X-API-Key: &lt;key&gt;</code> in the header.
                  </span>
                </div>
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
                  Regenerating will invalidate the current key immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rotate confirm modal */}
      {showRotateConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold tracking-tight">Regenerate API Key</h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Are you sure you want to regenerate the API key? This will invalidate the current key and any applications using it will stop working.
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