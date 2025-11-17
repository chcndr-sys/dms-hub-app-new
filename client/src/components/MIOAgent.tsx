import {useState, useEffect} from 'react';

const MIOAgent = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      const response = await fetch('/api/github/logs');
      const data = await response.json();
      setLogs(data.logs);
    };
    fetchLogs();
  }, []);

  return (
    <div>
      <h1>MIO Agent /Logs</h1>
      {logs.length === 0 ? (<p>No logs trovati</p>) : logs.map((log) => (
        <div style={{ marginBottom: '20px' }}>
          <pre>{log.filename}</pre>
          <pre>{log.content}</pre>
        </div>
      )}
    </div>
  );
};

export default MIOAgent;