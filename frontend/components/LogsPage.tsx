import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogFilters as FiltersComponent, SearchBar } from './LogFilters';
import { LogTable } from './LogTable';
import { LogEntry, LogFilters, PaginationState, BackendType, Project } from '../types';
import { fetchLogs, getServices } from '../services/logService';
import { Moon, Sun, Play, Pause, RefreshCw, Server, Database, ArrowLeft } from 'lucide-react';
import { useLocation } from 'react-router-dom';
type StorageBackend = BackendType;

interface LogsPageProps {
  project?: Project;
}

export const LogsPage: React.FC<LogsPageProps> = ({ project }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false); // Default to Light mode
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [storageBackend, setStorageBackend] = useState<StorageBackend>('elasticsearch'); // Default to Elasticsearch
  const [availableServices, setAvailableServices] = useState<string[]>([]);

  // Get project from location state or props
  const currentProject = location.state?.project || project;

  // State: Filters
  const [filters, setFilters] = useState<LogFilters>({
    query: '',
    level: 'ALL',
    service: 'ALL',
    startDate: '',
    endDate: ''
  });

  // State: Pagination
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    size: 50,
    total: 0
  });

  // Theme Toggler
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Data Fetcher
  const loadData = useCallback(async (isBackgroundRefresh = false) => {
    if (!isBackgroundRefresh) setLoading(true);
    try {
      const { data, total } = await fetchLogs({
        page: pagination.page,
        size: pagination.size,
        search: filters.query,
        level: filters.level,
        service: filters.service,
        startDate: filters.startDate,
        endDate: filters.endDate,
        backend: storageBackend,
        project_id: currentProject?.id
      });

      setLogs(data);
      setPagination(prev => ({ ...prev, total }));
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      if (!isBackgroundRefresh) setLoading(false);
    }
  }, [pagination.page, pagination.size, filters, storageBackend, currentProject]);

  // Load available services when backend changes
  useEffect(() => {
    const loadServices = async () => {
      try {
        const services = await getServices(storageBackend);
        setAvailableServices(services);
      } catch (error) {
        console.error('Failed to load services:', error);
        setAvailableServices([]);
      }
    };

    loadServices();
  }, [storageBackend]);

  // Initial Load & Filter Changes
  useEffect(() => {
    loadData();
    // Reset to page 1 if filters change (implied logic, avoiding infinite loops)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page, storageBackend]);

  // Live Mode Effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLive) {
      interval = setInterval(() => {
        // Live mode with real API would use WebSocket or Server-Sent Events
        // For now, just refresh the data to show new logs
        if (pagination.page === 1) {
            loadData(true);
        }
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [isLive, loadData, pagination.page]);


  const handleFilterChange = (newFilters: LogFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on filter change
  };

  const handleQueryChange = (query: string) => {
    setFilters(prev => ({ ...prev, query }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on query change
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const totalPages = Math.ceil(pagination.total / pagination.size);

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-200">

        {/* Header */}
      <header className="bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-dark-border sticky top-0 z-30">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Top Row - Logo and Controls */}
          <div className="flex justify-between items-center h-16">

            {/* Logo Area */}
            <div className="flex items-center gap-3">
              {currentProject && (
                <button
                  onClick={() => navigate('/projects')}
                  className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Back to Projects"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div className="bg-brand-600 p-2 rounded-lg">
                <Server className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Log<span className="text-brand-600">Stream</span>
                </h1>
                {currentProject && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">{currentProject.name}</p>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
               {/* Live Toggle */}
               <button
                onClick={() => setIsLive(!isLive)}
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all
                    ${isLive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-800 ring-2 ring-green-500/20'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-transparent'}
                `}
              >
                {isLive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isLive ? 'Live' : 'Paused'}
                {isLive && <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>}
              </button>

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

              {/* Backend Selector */}
              <div className="relative group">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 hover:border-brand-500 dark:hover:border-brand-400 transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg min-w-[140px]">
                  <Database className="h-4 w-4 text-brand-600 dark:text-brand-400 transition-colors duration-300" />
                  <select
                    value={storageBackend}
                    onChange={(e) => setStorageBackend(e.target.value as StorageBackend)}
                    className="bg-transparent text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer appearance-none flex-1 pr-6 transition-colors duration-300 min-w-[0]"
                    title="Select Storage Backend"
                  >
                    <option value="sqlite">SQLite</option>
                    <option value="elasticsearch">Elasticsearch</option>
                    <option value="s3">S3</option>
                  </select>
                </div>
              </div>

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1"></div>

              {/* Theme Toggle */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Toggle Theme"
              >
                {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Bottom Row - Search Bar */}
          <div className="pb-4">
            <SearchBar
              query={filters.query}
              onQueryChange={handleQueryChange}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 bg-gray-50 dark:bg-dark-bg">
        <div className="max-w-8xl mx-auto">

            {/* Filters Section */}
            <FiltersComponent
                filters={filters}
                onFilterChange={handleFilterChange}
                availableServices={availableServices}
            />

            {/* Logs Table */}
            <div className="bg-white dark:bg-dark-bg shadow-sm min-h-[calc(100vh-180px)]">
                <LogTable logs={logs} loading={loading} />
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-surface sticky bottom-0 z-30">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm text-gray-700 dark:text-gray-400">
                            Showing <span className="font-medium text-gray-900 dark:text-white">{(pagination.page - 1) * pagination.size + 1}</span> to <span className="font-medium text-gray-900 dark:text-white">{Math.min(pagination.page * pagination.size, pagination.total)}</span> of <span className="font-medium text-gray-900 dark:text-white">{pagination.total}</span> results
                        </p>
                    </div>
                    <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                            <button
                                onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                                disabled={pagination.page === 1}
                                className="relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Previous
                            </button>
                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200">
                                Page {pagination.page}
                            </span>
                            <button
                                onClick={() => handlePageChange(Math.min(totalPages, pagination.page + 1))}
                                disabled={pagination.page >= totalPages}
                                className="relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};
