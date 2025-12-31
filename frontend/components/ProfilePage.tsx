import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { LogOut, User, ArrowLeft } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const credentials = authService.getCredentials();

  if (!credentials) {
    navigate('/join');
    return null;
  }

  const handleLogout = () => {
    authService.clearCredentials();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <header className="bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Profile</h1>
            <div className="w-16"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Profile Card */}
        <div className="bg-white dark:bg-dark-surface rounded-xl shadow-sm border border-gray-200 dark:border-dark-border">
          <div className="p-6">
            {/* Avatar */}
            <div className="flex justify-center mb-6">
              <div className="bg-brand-100 dark:bg-brand-900/30 p-4 rounded-full">
                <User className="h-12 w-12 text-brand-600 dark:text-brand-400" />
              </div>
            </div>

            {/* User Info */}
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Username</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {credentials.user.username}
                </p>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Account ID</p>
                <p className="font-mono text-sm text-gray-800 dark:text-gray-200 break-all">
                  {credentials.user.id}
                </p>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Member Since</p>
                <p className="text-gray-900 dark:text-white">
                  {credentials.user.created_at
                    ? new Date(credentials.user.created_at).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>

            {/* Logout Button */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
