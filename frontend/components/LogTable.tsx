import React, { useState } from 'react';
import { LogEntry, LogLevel } from '../types';
import { ChevronRight, ChevronDown, Copy, Activity } from 'lucide-react';

interface LogTableProps {
  logs: LogEntry[];
  loading: boolean;
}

const getLevelStyles = (level: LogLevel): string => {
  switch (level) {
    case 'ERROR': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-900/50';
    case 'CRITICAL': return 'bg-red-600 text-white dark:bg-red-700 dark:text-white border border-red-600';
    case 'WARNING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900/50';
    case 'INFO': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50';
    case 'DEBUG': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600';
    default: return 'bg-gray-100 text-gray-800';
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
    <div className="relative bg-gray-50 dark:bg-[#0d1117] rounded-md border border-gray-200 dark:border-gray-700 p-3 mt-2 font-mono text-xs overflow-x-auto shadow-inner">
        <button 
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded-md text-gray-500 hover:text-brand-600 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Copy JSON"
        >
            <Copy className="h-3 w-3" />
            <span className="sr-only">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      <pre className="text-gray-700 dark:text-gray-300 leading-relaxed">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
};

const LogRow: React.FC<{ log: LogEntry }> = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  const date = new Date(log.timestamp);
  const timeFormatted = date.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateFormatted = date.toLocaleDateString();

  return (
    <>
      <tr 
        onClick={() => setExpanded(!expanded)}
        className={`
            group cursor-pointer border-b border-gray-200 dark:border-gray-800 
            hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors
            ${expanded ? 'bg-blue-50/50 dark:bg-gray-800/80' : ''}
        `}
      >
        <td className="px-4 py-3 whitespace-nowrap w-8">
            {expanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-600 dark:text-gray-400 w-48">
          <div className="flex flex-col">
            <span className="font-medium text-gray-900 dark:text-gray-200">{timeFormatted}</span>
            <span className="text-xs opacity-75">{dateFormatted}</span>
          </div>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm w-32">
          <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${getLevelStyles(log.level)}`}>
            {log.level}
          </span>
        </td>
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 w-48">
           <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
               {log.service}
           </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 break-all max-w-xl">
          {log.message}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} className="px-4 py-2 bg-gray-50/50 dark:bg-[#161b22]">
            <div className="pl-10 pr-4">
                <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-3 w-3 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Metadata Payload</span>
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
          <div className="w-full h-96 flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mb-2"></div>
                  <p>Loading logs...</p>
              </div>
          </div>
      )
  }

  if (logs.length === 0) {
      return (
        <div className="w-full h-96 flex items-center justify-center text-gray-400 dark:text-gray-500">
            No logs found matching your criteria.
        </div>
      )
  }

  return (
    <div className="overflow-x-auto min-h-[500px]">
      <table className="min-w-full text-left table-auto">
        <thead className="bg-gray-50 dark:bg-dark-surface sticky top-0 z-10 shadow-sm">
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-8">
              
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Timestamp
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Level
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Service
            </th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Message
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-dark-bg divide-y divide-gray-200 dark:divide-gray-800">
          {logs.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </tbody>
      </table>
    </div>
  );
};
