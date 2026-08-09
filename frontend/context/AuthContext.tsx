import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { BACKEND_URL } from '../services/config';

interface AuthUser {
  id: string;
  username: string;
  api_key: string;
  created_at?: string;
}

interface AuthContextType {
  ready: boolean;
  user: AuthUser | null;
  join: () => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    const checkHealth = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/health`);
        return res.ok;
      } catch {
        return false;
      }
    };

    const poll = async () => {
      const ok = await checkHealth();
      if (ok && !cancelled) {
        setReady(true);
        return;
      }
      interval = setInterval(async () => {
        const ok = await checkHealth();
        if (ok && !cancelled) {
          setReady(true);
          if (interval) clearInterval(interval);
        }
      }, 1500);
    };

    poll();
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const credentials = authService.getCredentials();
    if (credentials) {
      setUser(credentials.user);
    } else {
      join();
    }
  }, [ready]);

  const join = async () => {
    try {
      const userData = await authService.registerUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to join', error);
    }
  };

  const refresh = async () => {
    try {
      const refreshed = await authService.refreshUser();
      if (refreshed) setUser(refreshed);
    } catch (error) {
      console.error('Failed to refresh user', error);
    }
  };

  const logout = () => {
    authService.clearCredentials();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ ready, user, join, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};