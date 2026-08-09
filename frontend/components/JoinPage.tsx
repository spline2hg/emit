import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Sparkles, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';

export const JoinPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ username: string; api_key: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const createAccount = async () => {
      try {
        const userData = await authService.registerUser();
        setUser({
          username: userData.username,
          api_key: userData.api_key,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create account');
      } finally {
        setLoading(false);
      }
    };

    createAccount();
  }, []);

  const handleContinue = () => {
    navigate('/workspaces');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="size-8 animate-spin rounded-full border-2 border-border border-t-primary"></div>
          <p className="text-sm">Setting up your account…</p>
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 flex justify-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="size-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-center text-foreground">
            Welcome to Emit
          </h1>
          <p className="mb-8 mt-1 text-center text-muted-foreground">
            Your account has been created
          </p>

          <div className="mb-6 space-y-5 rounded-lg border border-border bg-background/50 p-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Your username
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-3">
                <Sparkles className="size-5 text-primary" />
                <span className="font-mono text-lg font-medium text-foreground">
                  {user?.username}
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Your API key <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <div className="break-all rounded-lg border border-input bg-background px-4 py-3 pr-24 font-mono text-sm text-foreground">
                  {user?.api_key}
                </div>
                <button
                  onClick={() => copyToClipboard(user?.api_key || '')}
                  className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <p className="mt-2 text-xs text-destructive">
                Save this key securely — it won’t be shown again.
              </p>
            </div>
          </div>

          <button
            onClick={handleContinue}
            className="h-10 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Continue to workspaces →
          </button>
        </div>
      </div>
    </div>
  );
};