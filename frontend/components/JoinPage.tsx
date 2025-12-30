import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

export const JoinPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ username: string; api_key: string } | null>(null);

  useEffect(() => {
    // Auto-create account on page load
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
    navigate('/projects');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    // You could add a toast notification here
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-dark-surface flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Setting up your account...</p>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-bg dark:to-dark-surface flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-dark-border">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-4">
              <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
            Welcome to LogStream!
          </h1>
          <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
            Your account has been created
          </p>

          {/* User Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Username
              </label>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600">
                <Sparkles className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                <span className="text-lg font-mono font-semibold text-gray-900 dark:text-white">
                  {user?.username}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your OAuth Token (API Key)
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <div className="bg-white dark:bg-gray-900 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 font-mono text-sm text-gray-800 dark:text-gray-200 break-all pr-24">
                  {user?.api_key}
                </div>
                <button
                  onClick={() => copyToClipboard(user?.api_key || '', 'API Key')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Copy
                </button>
              </div>
              <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                * Save this token securely! You won't be able to see it again.
              </p>
            </div>
          </div>

          <button
            onClick={handleContinue}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Continue to Projects →
          </button>
        </div>
      </div>
    </div>
  );
};
