/**
 * 🚨 PANIC BUTTON - Emergency Reset UI
 * 
 * Componente per reset emergenza database agent_messages
 * Mostra contatore messaggi e pulsante reset con conferma
 */

import { useState, useEffect } from 'react';
import { authenticatedFetch } from '@/hooks/useImpersonation';

export function PanicButton() {
  const [messageCount, setMessageCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Carica conteggio messaggi
  const loadStatus = async () => {
    try {
      const res = await fetch('/api/mihub/panic/status');
      const data = await res.json();
      if (data.success) {
        setMessageCount(data.messages_count);
      }
    } catch (err) {
      console.error('[PanicButton] Error loading status:', err);
    }
  };

  // Reset database
  const handleReset = async () => {
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/mihub/panic/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'RESET_ALL_MESSAGES' })
      });
      const data = await res.json();
      
      if (data.success) {
        alert(`✅ Reset completato!\n${data.deleted} messaggi cancellati.`);
        setMessageCount(0);
        setShowConfirm(false);
      } else {
        alert(`❌ Errore: ${data.error}`);
      }
    } catch (err: any) {
      alert(`❌ Errore: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 10000); // Aggiorna ogni 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      padding: '16px',
      background: 'rgba(0, 0, 0, 0.8)',
      borderRadius: '12px',
      border: '2px solid #ef4444',
      color: 'white',
      zIndex: 9999,
      minWidth: '200px'
    }}>
      <div style={{ marginBottom: '12px', fontSize: '14px' }}>
        🚨 <strong>Panic Button</strong>
      </div>
      
      <div style={{ marginBottom: '12px', fontSize: '12px', opacity: 0.8 }}>
        Messaggi DB: <strong>{messageCount ?? '...'}</strong>
      </div>

      {!showConfirm ? (
        <button
          onClick={handleReset}
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          {loading ? '⏳ Resetting...' : '🗑️ Reset DB'}
        </button>
      ) : (
        <div>
          <div style={{ marginBottom: '8px', fontSize: '12px', color: '#fbbf24' }}>
            ⚠️ Confermi reset?
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleReset}
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '12px'
              }}
            >
              ✅ SÌ
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '8px',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '12px'
              }}
            >
              ❌ NO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
