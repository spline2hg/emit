import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Server, BarChart3, Shield, Zap, CheckCircle, AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    const initUser = async () => {
      // Check if user is already authenticated
      const credentials = authService.getCredentials();
      if (credentials) {
        setUser({ username: credentials.user.username });
        setLoading(false);
        return;
      }

      // If not authenticated, create a new account
      try {
        const userData = await authService.registerUser();
        setUser({ username: userData.username });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create account');
      } finally {
        setLoading(false);
      }
    };

    initUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-dark-surface flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Setting up your workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-dark-surface flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-dark-border">
            <div className="flex justify-center mb-6">
              <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4">
                <AlertCircle className="h-16 w-16 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2">
              Oops!
            </h1>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-dark-surface">
      {/* Header */}
      <header className="bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-brand-600 p-2 rounded-lg">
                <Server className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Log<span className="text-brand-600">Stream</span>
                </h1>
                {user && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Welcome, {user.username}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors"
            >
              My Projects
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Modern Log Management
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Stream, store, and analyze your logs in real-time with powerful filtering,
            multiple storage backends, and project-based organization.
          </p>
          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white text-lg font-semibold rounded-xl transition-all hover:scale-105 hover:shadow-lg"
          >
            <FolderOpen className="h-5 w-5" />
            Go to Projects
          </button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">
          <div className="bg-white dark:bg-dark-surface rounded-xl p-8 border border-gray-200 dark:border-dark-border hover:shadow-lg transition-shadow">
            <div className="bg-blue-100 dark:bg-blue-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Real-Time Ingestion
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Kafka-powered message queue ensures high-throughput log ingestion with real-time processing.
            </p>
          </div>

          <div className="bg-white dark:bg-dark-surface rounded-xl p-8 border border-gray-200 dark:border-dark-border hover:shadow-lg transition-shadow">
            <div className="bg-green-100 dark:bg-green-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Server className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Multiple Storage Backends
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Choose between SQLite, Elasticsearch, or S3-compatible storage for your logs.
            </p>
          </div>

          <div className="bg-white dark:bg-dark-surface rounded-xl p-8 border border-gray-200 dark:border-dark-border hover:shadow-lg transition-shadow">
            <div className="bg-purple-100 dark:bg-purple-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <FolderOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Project Organization
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Organize logs by projects with unique API keys for secure, isolated log management.
            </p>
          </div>

          <div className="bg-white dark:bg-dark-surface rounded-xl p-8 border border-gray-200 dark:border-dark-border hover:shadow-lg transition-shadow">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Powerful Filtering
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Filter logs by level, service, date range, and search across messages and metadata.
            </p>
          </div>

          <div className="bg-white dark:bg-dark-surface rounded-xl p-8 border border-gray-200 dark:border-dark-border hover:shadow-lg transition-shadow">
            <div className="bg-red-100 dark:bg-red-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Secure API Keys
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Project-specific API keys with OAuth token authentication for secure log ingestion.
            </p>
          </div>

          <div className="bg-white dark:bg-dark-surface rounded-xl p-8 border border-gray-200 dark:border-dark-border hover:shadow-lg transition-shadow">
            <div className="bg-brand-100 dark:bg-brand-900/30 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
              <Server className="h-6 w-6 text-brand-600 dark:text-brand-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Live Mode
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Watch logs stream in real-time with auto-refreshing live mode for instant visibility.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-12">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to get started?
          </h3>
          <p className="text-brand-100 text-lg mb-8 max-w-2xl mx-auto">
            Create an account, set up your projects, and start logging in seconds.
          </p>
          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-100 text-brand-600 text-lg font-semibold rounded-xl transition-colors"
          >
            <FolderOpen className="h-5 w-5" />
            View Projects
          </button>
        </div>
      </main>
    </div>
  );
};
