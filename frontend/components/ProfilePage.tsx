import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user: ctxUser, logout } = useAuth();

  const credentials = authService.getCredentials();
  const user = ctxUser || credentials?.user || null;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    navigate('/');
    return null;
  }

  const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.username)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
  const displayName = user.username
    .replace('_', ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const formatUserId = (id: string) => {
    return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}...`;
  };

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <div className="size-24 overflow-hidden rounded-full border-4 border-border bg-gradient-to-br from-primary/30 to-blue-400/30 shadow-lg sm:size-28">
              <img src={avatarUrl} alt={displayName} className="size-full object-cover" />
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {displayName}
            </h1>
            <p className="mb-4 mt-1 text-sm text-muted-foreground">@{user.username}</p>

            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 font-mono text-xs text-muted-foreground">
              <span>ID</span>
              <span>{formatUserId(user.id)}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-3 border-t border-border pt-6">
          <button
            onClick={handleLogout}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
          >
            <LogOut className="size-4" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;