import React from 'react';
import IMOLogs from '../components/MIOLogs';

export default function MIOPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">MIO: GitHub Logs</h1>
      <MIOLogs />
    </div>
  );
}
