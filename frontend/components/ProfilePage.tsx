import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { LogOut, User, Copy, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user: ctxUser, logout } = useAuth();

  const [copied, setCopied] = React.useState(false);

  const credentials = authService.getCredentials();
  const user = ctxUser || credentials?.user || null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-secondary">
            <User className="size-8 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-5">
          <div className="text-center">
            <p className="mb-1 text-sm text-muted-foreground">Username</p>
            <p className="text-2xl font-semibold tracking-tight">{user.username}</p>
          </div>

          <div className="border-t border-border pt-5">
            <p className="mb-2 text-sm text-muted-foreground">Account ID</p>
            <p className="break-all font-mono text-sm text-foreground">{user.id}</p>
          </div>

          <div className="border-t border-border pt-5">
            <p className="mb-2 text-sm text-muted-foreground">API Key</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg border border-input bg-background px-4 py-3 font-mono text-sm text-foreground">
                {user.api_key}
              </code>
              <button
                onClick={() => copyToClipboard(user.api_key)}
                className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Copy API key"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          
        </div>

        <div className="mt-8 border-t border-border pt-6">
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