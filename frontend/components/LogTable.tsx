import React, { useState } from 'react';
import { LogEntry, LogLevel } from '../types';
import { ChevronRight, ChevronDown, Copy, Activity, Loader2 } from 'lucide-react';

interface LogTableProps {
  logs: LogEntry[];
  loading: boolean;
}

const getLevelStyles = (level: LogLevel): string => {
  switch (level) {
    case 'ERROR':
      return 'border-red-900 bg-red-950/50 text-red-400';
    case 'CRITICAL':
      return 'border-destructive/30 bg-destructive text-primary-foreground';
    case 'WARNING':
      return 'border-amber-900 bg-amber-950/50 text-amber-400';
    case 'INFO':
      return 'border-blue-900 bg-blue-950/50 text-blue-400';
    case 'DEBUG':
      return 'border-border bg-secondary text-muted-foreground';
    default:
      return 'border-border bg-secondary text-muted-foreground';
  }
};

const JsonViewer: React.FC<{ data: any }> = ({ data }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative mt-2 rounded-md border border-border bg-background p-3 font-mono text-xs overflow-x-auto shadow-inner">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Copy JSON"
      >
        {copied ? <span className="text-xs text-green-400">Copied</span> : null}
        <Copy className="size-3.5" />
      </button>
      <pre className="leading-relaxed text-foreground">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
};

const LogRow: React.FC<{ log: LogEntry }> = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  const date = new Date(log.timestamp);
  const timeFormatted = date.toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const dateFormatted = date.toLocaleDateString();

  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        className={`
          group cursor-pointer border-b border-border transition-colors
          hover:bg-accent/40
          ${expanded ? 'bg-accent/50' : ''}
        `}
      >
        <td className="w-8 whitespace-nowrap px-4 py-3">
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </td>
        <td className="w-48 whitespace-nowrap px-4 py-3 font-mono text-sm text-muted-foreground">
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{timeFormatted}</span>
            <span className="text-xs opacity-70">{dateFormatted}</span>
          </div>
        </td>
        <td className="w-32 whitespace-nowrap px-4 py-3 text-sm">
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${getLevelStyles(log.level)}`}
          >
            {log.level}
          </span>
        </td>
        <td className="w-48 whitespace-nowrap px-4 py-3 text-sm">
          <span className="rounded border border-border bg-secondary px-2 py-0.5 font-mono text-xs text-foreground">
            {log.service}
          </span>
        </td>
        <td className="max-w-xl break-all px-4 py-3 text-sm text-foreground">{log.message}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="bg-muted/50 px-4 py-2">
            <div className="pl-10 pr-4">
              <div className="mb-1 flex items-center gap-2">
                <Activity className="size-3 text-muted-foreground" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Metadata payload
                </span>
              </div>
              <JsonViewer data={log.metadata} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export const LogTable: React.FC<LogTableProps> = ({ logs, loading }) => {
  if (loading && logs.length === 0) {
    return (
      <div className="flex h-full min-h-48 w-full items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm">Loading logs…</p>
        </div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="flex h-full min-h-48 w-full flex-col items-center justify-center gap-2 text-muted-foreground">
        <Activity className="size-10 opacity-40" />
        <p className="text-sm">No logs found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[500px] overflow-x-auto">
      <table className="min-w-full table-auto text-left">
        <thead className="sticky top-0 z-10 border-b border-border bg-card shadow-sm">
          <tr>
            <th scope="col" className="w-4 px-4 py-3"></th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Timestamp
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Level
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Service
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Message
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {logs.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </tbody>
      </table>
    </div>
  );
};