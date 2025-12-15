import { useState, useEffect, useRef } from 'react';

export type SystemStatus = 'online' | 'offline' | 'checking';

interface SystemStatusResult {
  apiStatus: SystemStatus;
  pm2Status: SystemStatus;
  lastCheck: Date | null;
}

export function useSystemStatus(pollInterval: number = 30000): SystemStatusResult {
  const [apiStatus, setApiStatus] = useState<SystemStatus>('checking');
  const [pm2Status, setPm2Status] = useState<SystemStatus>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const intervalRef = useRef<number | undefined>();

  const checkBackendAPI = async (): Promise<boolean> => {
    try {
      // Prova a fare ping all'endpoint health del backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch('/api/mihub/health', {
        signal: controller.signal,
        method: 'GET',
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('[useSystemStatus] Backend API check failed:', error);
      return false;
    }
  };

  const checkPM2Status = async (): Promise<boolean> => {
    try {
      // Prova a recuperare lo stato PM2 dal backend
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch('/api/system/pm2-status', {
        signal: controller.signal,
        method: 'GET',
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        // Verifica se il processo è online
        return data.status === 'online' || data.pm2_env?.status === 'online';
      }

      return false;
    } catch (error) {
      console.error('[useSystemStatus] PM2 status check failed:', error);
      // Se l'endpoint non esiste, assumiamo che PM2 sia online se il backend risponde
      return false;
    }
  };

  const performCheck = async () => {
    setApiStatus('checking');
    setPm2Status('checking');

    const [apiOk, pm2Ok] = await Promise.all([
      checkBackendAPI(),
      checkPM2Status(),
    ]);

    setApiStatus(apiOk ? 'online' : 'offline');
    setPm2Status(pm2Ok ? 'online' : 'offline');
    setLastCheck(new Date());
  };

  useEffect(() => {
    // Primo check immediato
    performCheck();

    // Polling periodico
    intervalRef.current = window.setInterval(performCheck, pollInterval);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [pollInterval]);

  return {
    apiStatus,
    pm2Status,
    lastCheck,
  };
}
