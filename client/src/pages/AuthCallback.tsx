/**
 * AuthCallback Page
 * Gestisce il ritorno dal provider OAuth (ARPA Regione Toscana)
 */
import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { handleCallback } from '@/api/authClient';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function AuthCallback() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      // Leggi parametri dalla URL
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Gestisci errore dal provider
      if (errorParam) {
        setStatus('error');
        setError(errorDescription || errorParam || 'Errore durante l\'autenticazione');
        return;
      }

      // Verifica parametri
      if (!code || !state) {
        setStatus('error');
        setError('Parametri di autenticazione mancanti');
        return;
      }

      try {
        const result = await handleCallback(code, state);
        setStatus('success');
        
        // Redirect alla pagina originale o alla dashboard
        setTimeout(() => {
          navigate(result.return_url || '/dashboard-pa', { replace: true });
        }, 1500);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Errore durante l\'autenticazione');
      }
    };

    processCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full p-8 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto text-teal-500 animate-spin" />
            <h2 className="mt-4 text-xl font-semibold text-white">
              Autenticazione in corso...
            </h2>
            <p className="mt-2 text-gray-400">
              Stiamo verificando le tue credenziali SPID/CIE
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
            <h2 className="mt-4 text-xl font-semibold text-white">
              Autenticazione completata!
            </h2>
            <p className="mt-2 text-gray-400">
              Reindirizzamento in corso...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 mx-auto text-red-500" />
            <h2 className="mt-4 text-xl font-semibold text-white">
              Errore di autenticazione
            </h2>
            <p className="mt-2 text-red-400">
              {error}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-6 px-6 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
            >
              Riprova
            </button>
          </>
        )}
      </div>
    </div>
  );
}
