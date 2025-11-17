import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

type LogFile = {
  filename: string;
  content: string;
};

export default function MIOLogs() {
  const [logs, setLogs] = useState<LogFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogFile | null>(null);

  useEffect(() => {
    fetch('/api/github/logs')
      .then(res => res.json())
      .then(data => {
        setLogs(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching logs:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <p>Caricamento log...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>📜 Log da GitHub</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-muted-foreground">Nessun log disponibile</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div
                  key={log.filename}
                  className="p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => setSelectedLog(log)}
                >
                  <p className="font-medium">{log.filename}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {log.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedLog?.filename}</DialogTitle>
          </DialogHeader>
          <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
            {selectedLog?.content}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
