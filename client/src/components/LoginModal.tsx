/**
 * LoginModal Component v2.0
 * Modal per la selezione del tipo di accesso con Firebase Authentication
 * 
 * Flusso:
 * 1. Selezione tipo utente (Cittadino / Impresa / PA)
 * 2. Selezione metodo di autenticazione per ruolo
 *    - Cittadino: Google, Apple, Email, SPID
 *    - Impresa: SPID, CIE, CNS
 *    - PA: SPID + Ruolo
 * 3. Autenticazione via Firebase (Google/Apple/Email) o ARPA (SPID/CIE/CNS)
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useFirebaseAuth, type UserRole } from '@/contexts/FirebaseAuthContext';
import { startLogin } from '@/api/authClient';
import { 
  X, Shield, Users, Building2, Landmark, Loader2, 
  CreditCard, Key, ChevronLeft, Mail, AlertCircle
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  redirectRoute?: string;
}

type UserType = 'citizen' | 'business' | 'pa' | null;

export default function LoginModal({ isOpen, onClose, redirectRoute }: LoginModalProps) {
  const [, navigate] = useLocation();
  const [userType, setUserType] = useState<UserType>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [emailForm, setEmailForm] = useState({ email: '', password: '', name: '', confirmPassword: '' });
  const [gdprConsent, setGdprConsent] = useState(false);

  // Firebase Auth context
  const { 
    signInWithEmail, 
    signUpWithEmail, 
    signInWithGoogle, 
    signInWithApple, 
    setUserRole,
    isAuthenticated,
    user,
    error: authError,
    clearError,
    sendResetEmail,
  } = useFirebaseAuth();

  // Redirect dopo login riuscito
  useEffect(() => {
    if (isAuthenticated && user && isOpen) {
      const targetRoute = getRedirectForRole(user.role);
      navigate(redirectRoute || targetRoute);
      handleClose();
    }
  }, [isAuthenticated, user, isOpen]);

  // Mostra errori dal context
  useEffect(() => {
    if (authError) {
      setError(authError);
      setLoading(false);
    }
  }, [authError]);

  if (!isOpen) return null;

  function getRedirectForRole(role: UserRole): string {
    switch (role) {
      case 'citizen': return '/wallet';
      case 'business': return '/dashboard-impresa';
      case 'pa': return '/dashboard-pa';
      default: return '/wallet';
    }
  }

  const handleClose = () => {
    setUserType(null);
    setError('');
    setLoading(false);
    setShowEmailForm(false);
    setIsRegistering(false);
    setShowResetPassword(false);
    setResetEmailSent(false);
    clearError();
    onClose();
  };

  const handleSelectUserType = (type: UserType) => {
    setUserType(type);
    if (type) {
      setUserRole(type as UserRole);
    }
  };

  // ============================================
  // FIREBASE AUTH HANDLERS
  // ============================================

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      // NON resettare loading qui: il sync backend è ancora in corso.
      // Il loading sarà resettato dal useEffect quando isAuthenticated diventa true,
      // oppure da handleClose se l'utente chiude manualmente il popup.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il login con Google');
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithApple();
      // NON resettare loading: sync backend in corso (vedi handleGoogleLogin)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il login con Apple');
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!emailForm.email || !emailForm.password) {
      setError('Inserisci email e password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signInWithEmail(emailForm.email, emailForm.password);
      // NON resettare loading: il sync backend (lookupLegacyUser, checkNeonRoles,
      // createFirebaseSession) è ancora in corso. Lo spinner resta visibile finché
      // isAuthenticated diventa true (e il useEffect chiude il modal),
      // oppure finché l'utente chiude manualmente con la X.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credenziali non valide');
      setLoading(false);
    }
  };

  const handleEmailRegister = async () => {
    if (!emailForm.email || !emailForm.password || !emailForm.name) {
      setError('Compila tutti i campi');
      return;
    }
    if (emailForm.password !== emailForm.confirmPassword) {
      setError('Le password non coincidono');
      return;
    }
    if (emailForm.password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return;
    }
    if (!gdprConsent) {
      setError('Devi accettare la Privacy Policy per registrarti');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await signUpWithEmail(emailForm.email, emailForm.password, emailForm.name);
      // NON resettare loading: sync backend in corso (vedi handleEmailLogin)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante la registrazione');
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!emailForm.email) {
      setError('Inserisci la tua email per il recupero password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendResetEmail(emailForm.email);
      setResetEmailSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore nell\'invio dell\'email di recupero');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // SPID/CIE/CNS HANDLER (ARPA Toscana)
  // ============================================

  const handleSPIDLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const targetRoute = getRedirectForRole(userType as UserRole);
      const authUrl = await startLogin(targetRoute);
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore durante il login SPID');
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (showResetPassword) {
      setShowResetPassword(false);
      setResetEmailSent(false);
      setError('');
      return;
    }
    if (showEmailForm) {
      setShowEmailForm(false);
      setIsRegistering(false);
      setError('');
      return;
    }
    setUserType(null);
    setError('');
  };

  // ============================================
  // RENDER: Selezione tipo utente
  // ============================================

  const renderUserTypeSelection = () => (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-white text-center mb-6">
        Come vuoi accedere?
      </h2>

      {/* Cittadino */}
      <button
        onClick={() => handleSelectUserType('citizen')}
        className="w-full group p-4 bg-card/80 backdrop-blur border border-primary/30 rounded-xl hover:border-primary hover:bg-primary/10 transition-all flex items-center gap-4"
      >
        <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center group-hover:bg-primary/30 transition-colors">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-white">Cittadino</h3>
          <p className="text-xs text-muted-foreground">Google, Apple, Email o SPID</p>
        </div>
      </button>

      {/* Impresa */}
      <button
        onClick={() => handleSelectUserType('business')}
        className="w-full group p-4 bg-card/80 backdrop-blur border border-amber-500/30 rounded-xl hover:border-amber-500 hover:bg-amber-500/10 transition-all flex items-center gap-4"
      >
        <div className="w-12 h-12 bg-amber-500/20 rounded-lg flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
          <Building2 className="w-6 h-6 text-amber-400" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-white">Impresa</h3>
          <p className="text-xs text-muted-foreground">SPID, CIE o CNS</p>
        </div>
      </button>

      {/* PA */}
      <button
        onClick={() => handleSelectUserType('pa')}
        className="w-full group p-4 bg-card/80 backdrop-blur border border-purple-500/30 rounded-xl hover:border-purple-500 hover:bg-purple-500/10 transition-all flex items-center gap-4"
      >
        <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center group-hover:bg-purple-500/30 transition-colors">
          <Landmark className="w-6 h-6 text-purple-400" />
        </div>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-white">PA / Admin</h3>
          <p className="text-xs text-muted-foreground">SPID + Ruolo assegnato</p>
        </div>
      </button>

      <p className="text-xs text-center text-muted-foreground mt-4">
        Autenticazione sicura - MioHub DMS
      </p>
    </div>
  );

  // ============================================
  // RENDER: Login Cittadino (Google, Apple, Email, SPID)
  // ============================================

  const renderCitizenLogin = () => (
    <div className="space-y-4">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-sm"
      >
        <ChevronLeft className="w-4 h-4" />
        Indietro
      </button>

      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/20 rounded-xl mb-3">
          <Users className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-white">Accesso Cittadino</h2>
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Google Sign-In */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-gray-800 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="font-medium">Continua con Google</span>
          </>
        )}
      </button>

      {/* Apple Sign-In */}
      <button
        onClick={handleAppleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-50 border border-gray-700"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <span className="font-medium">Continua con Apple</span>
          </>
        )}
      </button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-background text-muted-foreground">oppure</span>
        </div>
      </div>

      {/* Email */}
      <button
        onClick={() => setShowEmailForm(true)}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
      >
        <Mail className="w-5 h-5" />
        <span className="font-medium">Continua con Email</span>
      </button>

      {/* SPID */}
      <button
        onClick={handleSPIDLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
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
  );

  // ============================================
  // RENDER: Form Email Login/Register
  // ============================================

  const renderEmailForm = () => (
    <div className="space-y-4">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-sm"
      >
        <ChevronLeft className="w-4 h-4" />
        Indietro
      </button>

      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500/20 rounded-xl mb-3">
          <Mail className="w-7 h-7 text-emerald-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">
          {isRegistering ? 'Registrati' : 'Accedi con Email'}
        </h2>
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isRegistering && (
        <input
          type="text"
          placeholder="Nome e Cognome"
          value={emailForm.name}
          onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
          className="w-full px-4 py-3 bg-card/80 border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
      )}

      <input
        type="email"
        placeholder="Email"
        value={emailForm.email}
        onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
        onKeyDown={(e) => e.key === 'Enter' && !isRegistering && handleEmailLogin()}
        className="w-full px-4 py-3 bg-card/80 border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
      />

      <input
        type="password"
        placeholder="Password"
        value={emailForm.password}
        onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
        onKeyDown={(e) => e.key === 'Enter' && !isRegistering && handleEmailLogin()}
        className="w-full px-4 py-3 bg-card/80 border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
      />

      {isRegistering && (
        <input
          type="password"
          placeholder="Conferma Password"
          value={emailForm.confirmPassword}
          onChange={(e) => setEmailForm({ ...emailForm, confirmPassword: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && handleEmailRegister()}
          className="w-full px-4 py-3 bg-card/80 border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
      )}

      {isRegistering && (
        <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={gdprConsent}
            onChange={(e) => setGdprConsent(e.target.checked)}
            className="mt-0.5 accent-teal-500"
            aria-required="true"
          />
          <span>
            Accetto la{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:underline">
              Privacy Policy
            </a>{' '}
            e il trattamento dei dati personali ai sensi del GDPR (Reg. UE 2016/679)
          </span>
        </label>
      )}

      <button
        onClick={isRegistering ? handleEmailRegister : handleEmailLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <span className="font-medium">{isRegistering ? 'Registrati' : 'Accedi'}</span>
        )}
      </button>

      {!isRegistering && (
        <button
          onClick={() => { setShowResetPassword(true); setError(''); }}
          className="w-full text-center text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          Password dimenticata?
        </button>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {isRegistering ? (
          <>Hai già un account? <button onClick={() => { setIsRegistering(false); setError(''); }} className="text-primary hover:underline">Accedi</button></>
        ) : (
          <>Non hai un account? <button onClick={() => { setIsRegistering(true); setError(''); }} className="text-primary hover:underline">Registrati</button></>
        )}
      </p>
    </div>
  );

  // ============================================
  // RENDER: Reset Password
  // ============================================

  const renderResetPassword = () => (
    <div className="space-y-4">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-sm"
      >
        <ChevronLeft className="w-4 h-4" />
        Indietro
      </button>

      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/20 rounded-xl mb-3">
          <Key className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">Recupera Password</h2>
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {resetEmailSent ? (
        <div className="p-4 bg-green-500/20 border border-green-500/50 rounded-lg text-center">
          <p className="text-green-300 text-sm">
            Email di recupero inviata a <strong>{emailForm.email}</strong>
          </p>
          <p className="text-green-400/70 text-xs mt-2">
            Controlla la tua casella di posta (anche lo spam)
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground text-center">
            Inserisci la tua email e ti invieremo un link per reimpostare la password.
          </p>
          <input
            type="email"
            placeholder="Email"
            value={emailForm.email}
            onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
            className="w-full px-4 py-3 bg-card/80 border border-border rounded-xl text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleResetPassword}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <span className="font-medium">Invia email di recupero</span>
            )}
          </button>
        </>
      )}
    </div>
  );

  // ============================================
  // RENDER: Login Impresa/PA (SPID, CIE, CNS)
  // ============================================

  const renderSPIDLogin = () => (
    <div className="space-y-4">
      <button
        onClick={handleBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors text-sm"
      >
        <ChevronLeft className="w-4 h-4" />
        Indietro
      </button>

      <div className="text-center mb-4">
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-3 ${
          userType === 'business' ? 'bg-amber-500/20' : 'bg-purple-500/20'
        }`}>
          {userType === 'business' ? (
            <Building2 className="w-7 h-7 text-amber-400" />
          ) : (
            <Landmark className="w-7 h-7 text-purple-400" />
          )}
        </div>
        <h2 className="text-xl font-semibold text-white">
          {userType === 'business' ? 'Accesso Impresa' : 'Accesso PA'}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Autenticazione con identità digitale
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-sm text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SPID */}
      <button
        onClick={handleSPIDLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
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
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
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
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-slate-600 text-white rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
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

      <p className="text-xs text-center text-muted-foreground mt-4">
        Autenticazione gestita da ARPA - Regione Toscana
      </p>
    </div>
  );

  // ============================================
  // RENDER: Main Modal
  // ============================================

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-background/95 backdrop-blur border border-border rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        {!userType && renderUserTypeSelection()}
        {userType === 'citizen' && !showEmailForm && !showResetPassword && renderCitizenLogin()}
        {userType === 'citizen' && showEmailForm && !showResetPassword && renderEmailForm()}
        {userType === 'citizen' && showResetPassword && renderResetPassword()}
        {(userType === 'business' || userType === 'pa') && renderSPIDLogin()}
      </div>
    </div>
  );
}
