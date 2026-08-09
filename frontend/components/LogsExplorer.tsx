import React, { useState, useEffect, useCallback } from 'react';
import { LogFilters as FiltersComponent, SearchBar } from './LogFilters';
import { LogTable } from './LogTable';
import { LogEntry, LogFilters, PaginationState, BackendType } from '../types';
import { fetchLogs, getServices } from '../services/logService';
import { Database, Loader2 } from 'lucide-react';

type StorageBackend = BackendType;

interface LogsExplorerProps {
  workspaceId?: string;
}

const LogsExplorer: React.FC<LogsExplorerProps> = ({ workspaceId }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [storageBackend, setStorageBackend] = useState<StorageBackend>('elasticsearch');
  const [availableServices, setAvailableServices] = useState<string[]>([]);

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
        workspace_id: workspaceId,
      });

      setLogs(data);
      setPagination((prev) => ({ ...prev, total }));
    } catch (error) {
      console.error('Failed to fetch logs', error);
    } finally {
      if (!isBackgroundRefresh) setLoading(false);
    }
  }, [pagination.page, pagination.size, filters, storageBackend, workspaceId]);

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
  }, [filters, pagination.page, storageBackend, workspaceId]);

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

  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.size));

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar query={filters.query} onQueryChange={handleQueryChange} />
        <div className="flex shrink-0 items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2">
          <Database className="size-4 text-muted-foreground" />
          <select
            value={storageBackend}
            onChange={(e) => setStorageBackend(e.target.value as StorageBackend)}
            className="cursor-pointer bg-transparent text-sm font-medium text-foreground outline-none appearance-none"
            title="Select storage backend"
          >
            <option value="sqlite">SQLite</option>
            <option value="elasticsearch">Elasticsearch</option>
            <option value="s3">S3</option>
          </select>
        </div>
      </div>

      <FiltersComponent
        filters={filters}
        onFilterChange={handleFilterChange}
        availableServices={availableServices}
      />

      {/* Table */}
      <div className="min-h-[400px]">
        {loading && logs.length === 0 ? (
          <div className="flex h-72 items-center justify-center">
            <Loader2 size={28} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <LogTable logs={logs} loading={loading} />
        )}
      </div>

      {/* Pagination */}
      <div className="sticky bottom-0 z-30 rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-2.5">
          <p className="font-mono text-xs text-muted-foreground">
            {pagination.total === 0
              ? 'No results'
              : `Showing ${(pagination.page - 1) * pagination.size + 1} to ${Math.min(pagination.page * pagination.size, pagination.total)} of ${pagination.total}`}
          </p>
          <nav className="inline-flex rounded-md" aria-label="Pagination">
            <button
              onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page === 1}
              className="rounded-l-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="border-y border-border bg-secondary px-3 py-1.5 font-mono text-xs text-foreground">
              {pagination.page} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, pagination.page + 1))}
              disabled={pagination.page >= totalPages}
              className="rounded-r-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default LogsExplorer;