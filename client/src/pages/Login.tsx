/**
 * Login Page
 * Pagina di login con SPID/CIE/CNS via ARPA Regione Toscana
 * E Social Login (Google/Apple) per cittadini
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { startLogin, isAuthenticated, getAuthConfig, type AuthConfig } from '@/api/authClient';
import { Loader2, Shield, CreditCard, Key, AlertCircle, Users, Building2, Landmark } from 'lucide-react';

type UserType = 'citizen' | 'business' | 'pa' | null;

export default function Login() {
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [config, setConfig] = useState<AuthConfig | null>(null);
  const [userType, setUserType] = useState<UserType>(null);

  // Leggi returnUrl dai query params
  const searchParams = new URLSearchParams(window.location.search);
  const returnUrl = searchParams.get('returnUrl') || '/dashboard-pa';

  useEffect(() => {
    // Verifica se già autenticato
    isAuthenticated().then(authenticated => {
      if (authenticated) {
        navigate(returnUrl, { replace: true });
      }
    });

    // Carica configurazione
    getAuthConfig()
      .then(setConfig)
      .catch(err => {
        console.error('Errore caricamento config:', err);
      });
  }, [navigate, returnUrl]);

  const handleSPIDLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const authUrl = await startLogin(returnUrl);
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il login');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('Google Login - Da configurare');
    // TODO: Implementare Google OAuth
  };

  const handleAppleLogin = async () => {
    setError('Apple Login - Da configurare');
    // TODO: Implementare Apple Sign In
  };

  // Schermata selezione tipo utente
  if (!userType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-4xl w-full mx-4">
          {/* Logo e titolo */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-teal-500 rounded-2xl mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white">MIO-HUB</h1>
            <p className="mt-2 text-gray-400">Gemello Digitale del Commercio</p>
          </div>

          <h2 className="text-2xl font-semibold text-white text-center mb-8">
            Come vuoi accedere?
          </h2>

          {/* 3 Card di selezione */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* Cittadino */}
            <button
              onClick={() => setUserType('citizen')}
              className="group p-8 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl hover:border-teal-500 hover:bg-slate-800 transition-all text-left"
            >
              <div className="w-16 h-16 bg-teal-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-teal-500/30 transition-colors">
                <Users className="w-8 h-8 text-teal-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Cittadino</h3>
              <p className="text-gray-400 text-sm mb-4">
                Scopri mercati, accumula carbon credits e fai shopping sostenibile
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>✓ Mappa mercati e negozi</li>
                <li>✓ Wallet carbon credits</li>
                <li>✓ Percorsi shopping eco</li>
              </ul>
            </button>

            {/* Commerciante/Impresa */}
            <button
              onClick={() => setUserType('business')}
              className="group p-8 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl hover:border-amber-500 hover:bg-slate-800 transition-all text-left"
            >
              <div className="w-16 h-16 bg-amber-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-500/30 transition-colors">
                <Building2 className="w-8 h-8 text-amber-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Impresa</h3>
              <p className="text-gray-400 text-sm mb-4">
                Gestisci la tua attività, concessioni e guadagna carbon credits
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>✓ Dashboard vendite</li>
                <li>✓ Gestione posteggio</li>
                <li>✓ Catalogo prodotti</li>
              </ul>
              <div className="mt-4 px-2 py-1 bg-amber-500/20 rounded text-amber-400 text-xs inline-block">
                Richiede SPID
              </div>
            </button>

            {/* PA */}
            <button
              onClick={() => setUserType('pa')}
              className="group p-8 bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl hover:border-purple-500 hover:bg-slate-800 transition-all text-left"
            >
              <div className="w-16 h-16 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                <Landmark className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">PA / Admin</h3>
              <p className="text-gray-400 text-sm mb-4">
                Dashboard completa per monitorare e gestire il sistema
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>✓ Dashboard 26 sezioni</li>
                <li>✓ Monitoraggio mercati</li>
                <li>✓ Gestione completa</li>
              </ul>
              <div className="mt-4 px-2 py-1 bg-purple-500/20 rounded text-purple-400 text-xs inline-block">
                Richiede SPID + Ruolo
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              Autenticazione sicura tramite ARPA - Regione Toscana
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Schermata login Cittadino (Social Login)
  if (userType === 'citizen') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-md w-full mx-4">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-500 rounded-2xl mb-4">
              <Users className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Accesso Cittadino</h1>
            <p className="mt-2 text-gray-400">Scegli come accedere</p>
          </div>

          {/* Card login */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8">
            {error && (
              <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Google */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white text-gray-800 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium">Continua con Google</span>
              </button>

              {/* Apple */}
              <button
                onClick={handleAppleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-black text-white rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <span className="font-medium">Continua con Apple</span>
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800 text-gray-400">oppure</span>
                </div>
              </div>

              {/* SPID (opzionale per cittadini) */}
              <button
                onClick={handleSPIDLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Shield className="w-5 h-5" />
                    <span className="font-medium">Entra con SPID</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Back button */}
          <button
            onClick={() => setUserType(null)}
            className="mt-6 w-full text-center text-gray-400 hover:text-white transition-colors"
          >
            ← Torna alla selezione
          </button>
        </div>
      </div>
    );
  }

  // Schermata login Impresa/PA (Solo SPID)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 ${
            userType === 'business' ? 'bg-amber-500' : 'bg-purple-500'
          }`}>
            {userType === 'business' ? (
              <Building2 className="w-8 h-8 text-white" />
            ) : (
              <Landmark className="w-8 h-8 text-white" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">
            {userType === 'business' ? 'Accesso Impresa' : 'Accesso PA'}
          </h1>
          <p className="mt-2 text-gray-400">
            Autenticazione con identità digitale
          </p>
        </div>

        {/* Card login */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* SPID */}
            <button
              onClick={handleSPIDLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  <span className="font-medium">Entra con SPID</span>
                </>
              )}
            </button>

            {/* CIE */}
            <button
              onClick={handleSPIDLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span className="font-medium">Entra con CIE</span>
                </>
              )}
            </button>

            {/* CNS */}
            <button
              onClick={handleSPIDLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  <span className="font-medium">Entra con CNS</span>
                </>
              )}
            </button>
          </div>

          {/* Info ambiente */}
          {config && (
            <div className="mt-6 pt-6 border-t border-slate-600">
              <p className="text-xs text-center text-gray-500">
                Ambiente: {config.environment === 'staging' ? 'Test' : 'Produzione'}
              </p>
            </div>
          )}
        </div>

        {/* Back button */}
        <button
          onClick={() => setUserType(null)}
          className="mt-6 w-full text-center text-gray-400 hover:text-white transition-colors"
        >
          ← Torna alla selezione
        </button>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Autenticazione gestita da ARPA - Regione Toscana
          </p>
        </div>

        {/* Link info */}
        <div className="mt-4 text-center space-x-4">
          <a 
            href="https://www.spid.gov.it/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-teal-400 hover:underline"
          >
            Cos'è SPID?
          </a>
          <a 
            href="https://www.cartaidentita.interno.gov.it/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-teal-400 hover:underline"
          >
            Cos'è CIE?
          </a>
        </div>
      </div>
    </div>
  );
}
