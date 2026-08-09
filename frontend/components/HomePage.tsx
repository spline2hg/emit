import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, AlertCircle, ArrowRight } from 'lucide-react';
import { authService } from '../services/authService';
import { Logo } from './Logo';

const FEATURES = [
  'Realtime streaming',
  'Kafka ingestion',
  'SQLite · Elasticsearch · S3',
  'Workspace isolation',
  'API-key auth',
  'Instant search',
  'Level & service filters',
  'Date-range queries',
  'Batch ingest',
];

const PILLARS = [
  {
    title: 'Stream in realtime',
    description:
      'Kafka-backed ingestion with async processing keeps your pipeline fast, resilient and always up to date.',
  },
  {
    title: 'Store anywhere',
    description:
      'Swap SQLite, Elasticsearch or S3 storage without touching a line of your ingestion code.',
  },
  {
    title: 'Secure by default',
    description:
      'Every workspace gets its own API keys with OAuth token auth for isolated, auditable log streams.',
  },
];

const CURL_EXAMPLE = `curl -X POST http://localhost:8000/ingest \\
  -H "X-API-Key: your_api_key:your_workspace_id" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "User signed in",
    "level": "INFO",
    "service": "auth"
  }'`;

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const initUser = async () => {
      const credentials = authService.getCredentials();
      if (credentials) {
        setLoading(false);
        return;
      }

      try {
        await authService.registerUser();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create account');
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, []);

  const copyExample = () => {
    navigator.clipboard.writeText(CURL_EXAMPLE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary"></div>
          <p className="text-sm">Preparing your workspace…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="size-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 h-9 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 md:px-6">
          <Logo onClick={() => navigate('/')} />
          <nav className="flex items-center gap-1">
            <button
              onClick={() => navigate('/workspaces')}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Get started
            </button>
            <button
              onClick={() => navigate('/workspaces')}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Workspaces
            </button>
          </nav>
        </div>
      </header>

      {/* Hero + linked sections, following the uiexample layout */}
      <main className="bg-sidebar pb-32">
        <div className="mx-auto max-w-5xl">
          {/* Hero */}
          <section className="space-y-6 px-4 pb-16 pt-16 text-center sm:pt-24">
            <div className="mx-auto w-full max-w-4xl space-y-5">
              <h1 className="text-balance text-center text-[40px] font-semibold leading-[1.1] tracking-tight sm:text-5xl xl:text-6xl">
                Stream, store and analyze logs — without the plumbing
              </h1>
              <p className="mx-auto max-w-3xl text-balance leading-relaxed text-muted-foreground sm:text-xl">
                Emit is a lightweight log platform with realtime ingestion,
                workspace-based isolation and pluggable storage. One API key is
                all you need to start.
              </p>
            </div>
            <div className="mx-auto flex w-fit flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => navigate('/workspaces')}
                className="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Get started
                <ArrowRight className="size-4" />
              </button>
              <button
                onClick={() => navigate('/workspaces')}
                className="h-10 rounded-md border border-border bg-background px-6 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                My workspaces
              </button>
            </div>
          </section>

          {/* Linked sections */}
          <div className="grid divide-y border-y border-border sm:border-x">
            {/* Code demo */}
            <div className="grid gap-12 p-8 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border sm:p-0">
              <div className="flex flex-col justify-center gap-2 text-balance sm:p-12">
                <h2 className="text-balance text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
                  Send a log in one request
                </h2>
                <p className="mt-2 text-balance text-lg text-muted-foreground">
                  Post JSON to <code className="rounded bg-secondary px-1 py-0.5 text-sm font-mono text-foreground">/ingest</code>{' '}
                  with your workspace key. Emit routes it through Kafka, stores
                  it, and makes it searchable instantly.
                </p>
              </div>
              <div className="col-span-2 sm:p-12">
                <div className="relative overflow-hidden rounded-lg border border-border bg-background">
                  <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-border"></span>
                      <span className="size-2.5 rounded-full bg-border"></span>
                      <span className="size-2.5 rounded-full bg-border"></span>
                    </div>
                    <span className="text-xs text-muted-foreground">terminal</span>
                  </div>
                  <button
                    onClick={copyExample}
                    className="absolute right-3 top-10 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    title="Copy example"
                  >
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                  <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed">
                    <code>
                      <span className="text-[#ff7b72]">curl -X POST </span>
                      <span className="text-[#a5d6ff]">http://localhost:8000/ingest</span>
                      <span className="text-[#8b949e]">\</span>
                      {'\n'}
                      <span className="text-[#79c0ff]">  -H </span>
                      <span className="text-[#ffa657]">&quot;X-API-Key: </span>
                      <span className="text-[#a5d6ff]">your_api_key:your_workspace_id</span>
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
                      <span className="text-[#a5d6ff]">&quot;User signed in&quot;</span>
                      <span className="text-[#8b949e]">,</span>
                      {'\n'}
                      <span className="text-[#d2a8ff]">    &quot;level&quot;: </span>
                      <span className="text-[#a5d6ff]">&quot;INFO&quot;</span>
                      <span className="text-[#8b949e]">,</span>
                      {'\n'}
                      <span className="text-[#d2a8ff]">    &quot;service&quot;: </span>
                      <span className="text-[#a5d6ff]">&quot;auth&quot;</span>
                      {'\n'}
                      <span className="text-[#c9d1d9]">  {'}'}&apos;</span>
                    </code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Feature cloud */}
            <div className="grid items-center gap-10 overflow-hidden px-4 py-8 sm:px-12 sm:py-12">
              <div className="mx-auto grid max-w-3xl gap-4 text-center">
                <h2 className="text-balance text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl lg:text-[40px]">
                  Built for realtime, hardened for production
                </h2>
                <p className="text-balance text-lg text-muted-foreground">
                  Everything you need to collect, store and inspect logs —
                  without the complexity.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {FEATURES.map((feature) => (
                  <span
                    key={feature}
                    className="rounded-full border border-border px-3 py-1 text-sm text-foreground"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            {/* Pillars */}
            <div className="grid gap-8 px-4 py-8 sm:px-12 sm:py-12 md:grid-cols-3">
              {PILLARS.map((pillar) => (
                <div key={pillar.title}>
                  <h3 className="mb-2 text-lg font-semibold tracking-tight">
                    {pillar.title}
                  </h3>
                  <p className="text-muted-foreground">{pillar.description}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <section className="flex flex-col gap-4 px-8 py-10 sm:px-12 md:flex-row md:items-center md:justify-between">
              <h2 className="text-balance text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl lg:text-[40px]">
                Start building with Emit
              </h2>
              <button
                onClick={() => navigate('/workspaces')}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Get started
                <ArrowRight className="size-4" />
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};