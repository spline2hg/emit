import React from 'react';
import LogsExplorer from './LogsExplorer';

const LogsPage: React.FC = () => {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[32px] font-semibold tracking-tight">Logs</h1>
        <p className="mt-1 text-muted-foreground">Search and filter across all your log streams.</p>
      </div>
      <LogsExplorer />
    </div>
  );
};

export default LogsPage;