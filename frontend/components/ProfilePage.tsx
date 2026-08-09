import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { LogOut, User, ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const credentials = authService.getCredentials();

  if (!credentials) {
    navigate('/');
    return null;
  }

  const handleLogout = () => {
    authService.clearCredentials();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/workspaces')}
              className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Back to workspaces"
            >
              <ArrowLeft className="size-4" />
            </button>
            <Logo onClick={() => navigate('/')} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <div className="mb-6 flex justify-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
              <User className="size-8 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-5">
            <div className="text-center">
              <p className="mb-1 text-sm text-muted-foreground">Username</p>
              <p className="text-2xl font-semibold tracking-tight">
                {credentials.user.username}
              </p>
            </div>

            <div className="border-t border-border pt-5">
              <p className="mb-2 text-sm text-muted-foreground">Account ID</p>
              <p className="break-all font-mono text-sm text-foreground">
                {credentials.user.id}
              </p>
            </div>

            <div className="border-t border-border pt-5">
              <p className="mb-2 text-sm text-muted-foreground">Member since</p>
              <p className="text-foreground">
                {credentials.user.created_at
                  ? new Date(credentials.user.created_at).toLocaleDateString()
                  : 'N/A'}
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-6">
            <button
              onClick={handleLogout}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-destructive hover:text-white"
            >
              <LogOut className="size-4" />
              Log out
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};