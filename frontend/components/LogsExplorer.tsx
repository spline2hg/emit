import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LogFilters as FiltersComponent, SearchBar } from './LogFilters';
import { LogTable } from './LogTable';
import { LogEntry, LogFilters, PaginationState, BackendType } from '../types';
import { fetchLogs, getServices, getStorageBackends } from '../services/logService';
import { Check, ChevronDown, Database, Loader2 } from 'lucide-react';

type StorageBackend = BackendType;

const BACKEND_OPTIONS: Array<{
  id: StorageBackend;
  label: string;
  description: string;
}> = [
  { id: 'sqlite', label: 'SQLite', description: 'Local relational storage' },
  { id: 'elasticsearch', label: 'Elasticsearch', description: 'Search-optimized storage' },
  { id: 's3', label: 'S3', description: 'Object storage' },
];

interface LogsExplorerProps {
  workspaceId?: string;
  workspaceKey?: string;
}

const LogsExplorer: React.FC<LogsExplorerProps> = ({ workspaceId, workspaceKey }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageBackend, setStorageBackend] = useState<StorageBackend | null>(null);
  const [availableBackends, setAvailableBackends] = useState<StorageBackend[]>([]);
  const [backendsLoading, setBackendsLoading] = useState(true);
  const [backendMenuOpen, setBackendMenuOpen] = useState(false);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const backendMenuRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState<LogFilters>({
    query: '',
    level: 'ALL',
    service: 'ALL',
    startDate: '',
    endDate: '',
  });

  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    size: 20,
    total: 0,
  });

  const loadData = useCallback(async (isBackgroundRefresh = false) => {
    if (!workspaceKey || !storageBackend) {
      setLogs([]);
      setPagination((prev) => ({ ...prev, total: 0 }));
      return;
    }
    if (!isBackgroundRefresh) setLoading(true);
    try {
      const { data, total } = await fetchLogs(
        {
          page: pagination.page,
          size: pagination.size,
          search: filters.query,
          level: filters.level,
          service: filters.service,
          startDate: filters.startDate,
          endDate: filters.endDate,
          backend: storageBackend ?? undefined,
        },
        workspaceKey,
      );

      setLogs(data);
      setPagination((prev) => ({ ...prev, total }));
      setError(null);
    } catch (error) {
      console.error('Failed to fetch logs', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch logs');
    } finally {
      if (!isBackgroundRefresh) setLoading(false);
    }
  }, [pagination.page, pagination.size, filters, storageBackend, workspaceKey]);

  useEffect(() => {
    const closeBackendMenu = (event: MouseEvent) => {
      if (backendMenuRef.current && !backendMenuRef.current.contains(event.target as Node)) {
        setBackendMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', closeBackendMenu);
    return () => document.removeEventListener('mousedown', closeBackendMenu);
  }, []);

  useEffect(() => {
    const loadBackends = async () => {
      if (!workspaceKey) return;

      setBackendsLoading(true);
      try {
        const backends = (await getStorageBackends(workspaceKey)) as StorageBackend[];
        setAvailableBackends(backends);
        setStorageBackend((current) =>
          current && backends.includes(current) ? current : backends[0] ?? null,
        );
        setError(null);
      } catch (error) {
        setAvailableBackends([]);
        setStorageBackend(null);
        setError(error instanceof Error ? error.message : 'Failed to load storage configuration');
      } finally {
        setBackendsLoading(false);
      }
    };

    loadBackends();
  }, [workspaceKey]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pagination.page, storageBackend, workspaceKey]);

  useEffect(() => {
    const loadServices = async () => {
      if (!workspaceKey || !storageBackend) return;
      try {
        const services = await getServices(storageBackend, workspaceKey);
        setAvailableServices(services);
      } catch (error) {
        console.error('Failed to load services:', error);
        setAvailableServices([]);
      }
    };

    loadServices();
  }, [storageBackend, workspaceKey]);

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

  const paginationNav = (
    <nav className="inline-flex items-center gap-2" aria-label="Pagination">
      <button
        onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
        disabled={pagination.page === 1 || loading}
        className="rounded-l-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        Prev
      </button>
      <span className="rounded-md border border-border bg-secondary px-2.5 py-1.5 font-mono text-xs text-foreground">
        {pagination.page} / {totalPages}
      </span>
      <button
        onClick={() => handlePageChange(Math.min(totalPages, pagination.page + 1))}
        disabled={pagination.page >= totalPages || loading}
        className="rounded-r-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      {/* Toolbar + filters */}
      <div className="shrink-0 rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-2 sm:px-6">
          <SearchBar query={filters.query} onQueryChange={handleQueryChange} />
          <div ref={backendMenuRef} className="relative shrink-0">
            <div className="flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 transition-colors hover:border-foreground/20">
              <Database className="size-4 text-muted-foreground" />
              <button
                type="button"
                onClick={() => setBackendMenuOpen((open) => !open)}
                disabled={backendsLoading || !storageBackend}
                className="flex min-w-[132px] items-center justify-between gap-3 bg-transparent text-left text-sm font-medium text-foreground outline-none disabled:cursor-not-allowed disabled:opacity-60"
                aria-haspopup="listbox"
                aria-expanded={backendMenuOpen}
              >
                <span>{BACKEND_OPTIONS.find((option) => option.id === storageBackend)?.label ?? 'Loading...'}</span>
                <ChevronDown className={`size-3.5 shrink-0 text-muted-foreground transition-transform ${backendMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {backendMenuOpen && (
              <div
                className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl shadow-black/10"
                role="listbox"
                aria-label="Storage backend"
              >
                <div className="border-b border-border px-3 py-2">
                  <p className="text-xs font-medium">Storage backend</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">Choose where this workspace reads logs from.</p>
                </div>
                <div className="pt-1">
                  {BACKEND_OPTIONS.map((option) => {
                    const configured = availableBackends.includes(option.id);
                    const selected = storageBackend === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        disabled={!configured}
                        onClick={() => {
                          setStorageBackend(option.id);
                          setBackendMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <div className={`flex size-8 items-center justify-center rounded-md ${selected ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                          <Database className="size-3.5" />
                        </div>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{option.label}</span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {configured ? option.description : 'Not configured on this backend'}
                          </span>
                        </span>
                        {selected && <Check className="size-4 shrink-0 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <FiltersComponent
          filters={filters}
          onFilterChange={handleFilterChange}
          availableServices={availableServices}
          right={paginationNav}
        />
      </div>

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
        {error ? (
          <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-center">
            <p className="text-sm font-medium text-destructive">Failed to load logs</p>
            <p className="max-w-md text-xs text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <LogTable logs={logs} loading={loading} />
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsExplorer;