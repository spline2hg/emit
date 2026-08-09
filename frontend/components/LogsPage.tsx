import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogFilters as FiltersComponent, SearchBar } from './LogFilters';
import { LogTable } from './LogTable';
import { LogEntry, LogFilters, PaginationState, BackendType, Workspace } from '../types';
import { fetchLogs, getServices } from '../services/logService';
import { Database, ArrowLeft } from 'lucide-react';
import { Logo } from './Logo';
type StorageBackend = BackendType;

interface LogsPageProps {
  workspace?: Workspace;
}

export const LogsPage: React.FC<LogsPageProps> = ({ workspace }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [storageBackend, setStorageBackend] = useState<StorageBackend>('elasticsearch');
  const [availableServices, setAvailableServices] = useState<string[]>([]);

  const currentWorkspace = location.state?.workspace || workspace;

  const [filters, setFilters] = useState<LogFilters>({
    query: '',
    level: 'ALL',
    service: 'ALL',
    startDate: '',
    endDate: '',
  });

  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    size: 50,
    total: 0,
  });

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
        workspace_id: currentWorkspace?.id,
      });

      setLogs(data);
      setPagination((prev) => ({ ...prev, total }));
    } catch (error) {
      console.error('Failed to fetch logs', error);
    } finally {
      if (!isBackgroundRefresh) setLoading(false);
    }
  }, [pagination.page, pagination.size, filters, storageBackend, currentWorkspace]);

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

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page, storageBackend]);

  const handleFilterChange = (newFilters: LogFilters) => {
    setFilters(newFilters);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleQueryChange = (query: string) => {
    setFilters((prev) => ({ ...prev, query }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const totalPages = Math.ceil(pagination.total / pagination.size);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              {currentWorkspace && (
                <button
                  onClick={() => navigate('/workspaces')}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  title="Back to workspaces"
                >
                  <ArrowLeft className="size-4" />
                </button>
              )}
              <div className="flex min-w-0 items-center gap-3">
                <Logo onClick={() => navigate('/')} />
                {currentWorkspace && (
                  <>
                    <span className="h-4 w-px bg-border"></span>
                    <span className="truncate text-sm text-muted-foreground">
                      {currentWorkspace.name}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5">
                <Database className="size-4 text-muted-foreground" />
                <select
                  value={storageBackend}
                  onChange={(e) => setStorageBackend(e.target.value as StorageBackend)}
                  className="bg-transparent text-sm font-medium text-foreground outline-none appearance-none cursor-pointer"
                  title="Select storage backend"
                >
                  <option value="sqlite">SQLite</option>
                  <option value="elasticsearch">Elasticsearch</option>
                  <option value="s3">S3</option>
                </select>
              </div>
            </div>
          </div>

          {/* Search row */}
          <div className="pb-4">
            <SearchBar query={filters.query} onQueryChange={handleQueryChange} />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl">
          <FiltersComponent
            filters={filters}
            onFilterChange={handleFilterChange}
            availableServices={availableServices}
          />

          <div className="min-h-[calc(100vh-220px)]">
            <LogTable logs={logs} loading={loading} />
          </div>

          {/* Pagination */}
          <div className="sticky bottom-0 z-30 border-t border-border bg-card">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
              <p className="text-sm text-muted-foreground">
                Showing{' '}
                <span className="font-medium text-foreground">
                  {(pagination.page - 1) * pagination.size + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium text-foreground">
                  {Math.min(pagination.page * pagination.size, pagination.total)}
                </span>{' '}
                of{' '}
                <span className="font-medium text-foreground">{pagination.total}</span>{' '}
                results
              </p>
              <nav
                className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                aria-label="Pagination"
              >
                <button
                  onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page === 1}
                  className="relative inline-flex items-center rounded-l-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="relative inline-flex items-center border-y border-border bg-card px-3 py-2 text-sm font-medium text-foreground">
                  Page {pagination.page}
                </span>
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, pagination.page + 1))}
                  disabled={pagination.page >= totalPages}
                  className="relative inline-flex items-center rounded-r-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};