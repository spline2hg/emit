import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Loader2, Activity, Zap } from 'lucide-react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import WorkspaceView from './components/WorkspaceView';
import ProfilePage from './components/ProfilePage';
import Navbar from './components/Navbar';
import { AuthProvider, useAuth } from './context/AuthContext';

const LOADING_FACTS = [
  { icon: Activity, text: 'Realtime log ingestion keeps your observability pipeline fresh by the second' },
  { icon: Zap, text: 'Workspace-level API keys isolate teams, services and environments' },
  { icon: Activity, text: 'Pluggable storage lets you switch between SQLite, Elasticsearch and S3' },
  { icon: Zap, text: 'Level, service and date filters turn a noisy stream into a targeted trace' },
];

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pb-10 pt-24 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { ready, user } = useAuth();

  if (!ready) {
    const factIndex = Math.floor(Date.now() / 5000) % LOADING_FACTS.length;
    const fact = LOADING_FACTS[factIndex];
    const FactIcon = fact.icon;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full border border-border bg-secondary">
            <Loader2 size={24} className="animate-spin text-muted-foreground" />
          </div>
          <div>
            <h2 className="mb-1 text-[18px] font-semibold text-foreground">Connecting to backend</h2>
            <p className="text-[14px] text-muted-foreground">Starting up Emit services...</p>
          </div>
          <div className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4">
            <FactIcon size={18} className="shrink-0 text-muted-foreground" />
            <span className="text-left text-[12px] text-muted-foreground">{fact.text}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
          <span className="text-[14px] text-muted-foreground">Setting up your workspace...</span>
        </div>
      </div>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}

function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ScrollToTop />
        <Routes>
          {/* Home page - public, single entry point */}
          <Route path="/" element={<LandingPage />} />

          {/* Protected app routes */}
          <Route
            path="/workspaces"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/workspaces/:id"
            element={
              <ProtectedRoute>
                <WorkspaceView />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;