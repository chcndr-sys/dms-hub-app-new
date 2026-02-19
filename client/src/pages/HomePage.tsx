import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import LoginModal from '@/components/LoginModal';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Search, MapPin, Store, Building2, Leaf, TrendingUp, BarChart3, LogIn, LogOut,
  Bell, Wallet, Activity, ClipboardList, Menu, Presentation, User
} from 'lucide-react';
import { geoAPI } from '@/utils/api';
import { firebaseLogout } from '@/lib/firebase';

interface SearchResult {
  id: string;
  name: string;
  type: 'mercato' | 'hub' | 'negozio' | 'servizio' | 'impresa' | 'vetrina' | 'merceologia' | 'citta';
  city: string;
  distance?: number;
  isOpen?: boolean;
  lat?: number;
  lng?: number;
  mercato?: string;
  impresa?: string;
  descrizione?: string;
}

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  // Permessi utente per controllare visibilità tab
  const { canViewTab, canViewQuickAccess, loading: permissionsLoading } = usePermissions();

  // Determina il ruolo utente per mostrare i tasti giusti
  const [userRole, setUserRole] = useState<'citizen' | 'business' | 'admin' | null>(null);

  // Controlla autenticazione all'avvio
  useEffect(() => {
    const checkAuth = () => {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!(userStr && token));
      // Determina ruolo utente
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.is_super_admin || user.base_role === 'admin') {
            setUserRole('admin');
          } else if (user.base_role === 'business') {
            setUserRole('business');
          } else {
            setUserRole('citizen');
          }
        } catch { setUserRole('citizen'); }
      } else {
        setUserRole(null);
      }
    };
    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

  // Fetch notifiche non lette per l'impresa dell'utente
  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        const impresaId = user.impresa_id;
        if (!impresaId) return;
        
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
        const response = await fetch(`${API_BASE_URL}/api/notifiche/impresa/${impresaId}?limit=100`);
        if (response.ok) {
          const data = await response.json();
          // v3.73.0: Usa il conteggio non_lette dal backend invece di filtrare
          if (data.success && data.data) {
            setUnreadNotifications(data.data.non_lette || 0);
          }
        }
      } catch (error) {
        console.error('Errore fetch notifiche:', error);
      }
    };
    
    if (isAuthenticated) {
      fetchUnreadNotifications();
      // Aggiorna ogni 60 secondi
      const interval = setInterval(fetchUnreadNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Naviga dopo login riuscito
  useEffect(() => {
    if (isAuthenticated && pendingRoute) {
      setLocation(pendingRoute);
      setPendingRoute(null);
    }
  }, [isAuthenticated, pendingRoute]);

  // Gestisce click su tab protetti
  const handleProtectedNavigation = (route: string) => {
    if (isAuthenticated) {
      setLocation(route);
    } else {
      setPendingRoute(route);
      setShowLoginModal(true);
    }
  };

  // Dati demo per la ricerca
  const allResults: SearchResult[] = [
    { id: '1', name: 'Mercato Esperanto', type: 'mercato', city: 'Grosseto', distance: 0.5, isOpen: true, lat: 42.7634, lng: 11.1136 },
    { id: '2', name: 'Hub Sostenibile Roma', type: 'hub', city: 'Roma', distance: 150, isOpen: true, lat: 41.9028, lng: 12.4964 },
    { id: '3', name: 'Mercato Centrale', type: 'mercato', city: 'Firenze', distance: 120, isOpen: false, lat: 43.7696, lng: 11.2558 },
    { id: '4', name: 'Bio Market Milano', type: 'mercato', city: 'Milano', distance: 300, isOpen: true, lat: 45.4642, lng: 9.1900 },
    { id: '5', name: 'Negozio KM0 Toscana', type: 'negozio', city: 'Siena', distance: 45, isOpen: true, lat: 43.3188, lng: 11.3308 },
    { id: '6', name: 'Servizio Riparazione', type: 'servizio', city: 'Grosseto', distance: 1.2, isOpen: true, lat: 42.7634, lng: 11.1136 },
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Chiamata API backend
    const { data, error } = await geoAPI.search(searchQuery, 42.7634, 11.1136);
    
    if (error || !data) {
      console.error('Search error:', error);
      // Fallback a dati mock in caso di errore
      const filtered = allResults
        .filter(r => 
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.type.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
      setSearchResults(filtered);
      setShowResults(true);
      return;
    }

    // Mappa risultati API al formato locale
    const mapped = data.results.map((r: any) => ({
      id: r.id,
      name: r.name,
      type: r.type as SearchResult['type'],
      city: r.city || 'N/A',
      distance: r.distance ? r.distance / 1000 : undefined,
      isOpen: r.isOpen,
      lat: r.lat || 0,
      lng: r.lng || 0,
      mercato: r.mercato,
      impresa: r.impresa,
      descrizione: r.descrizione,
    }));
    
    const filtered = mapped;

    setSearchResults(filtered);
    setShowResults(true);
  };

  const handleResultClick = (result: SearchResult) => {
    // Per imprese, negozi e vetrine -> apri la vetrina
    if (result.type === 'impresa' || result.type === 'negozio' || result.type === 'vetrina') {
      // Estrai ID numerico da "impresa_25" -> 25
      const numericId = result.id.replace(/\D/g, '');
      setLocation(`/vetrine/${numericId}?from=search&q=${encodeURIComponent(searchQuery)}`);
    } else if (result.type === 'mercato' || result.type === 'hub') {
      // Per mercati e hub -> vai alla mappa GIS nella dashboard
      setLocation(`/dashboard-pa?tab=mappa&lat=${result.lat}&lng=${result.lng}&zoom=15`);
    } else {
      // Fallback per città, merceologia, ecc.
      setLocation(`/dashboard-pa?tab=mappa&lat=${result.lat}&lng=${result.lng}&zoom=12`);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mercato': return <Store className="w-4 h-4" />;
      case 'hub': return <Building2 className="w-4 h-4" />;
      case 'negozio': return <MapPin className="w-4 h-4" />;
      case 'servizio': return <TrendingUp className="w-4 h-4" />;
      case 'impresa': return <Building2 className="w-4 h-4" />;
      case 'vetrina': return <Store className="w-4 h-4" />;
      case 'merceologia': return <Leaf className="w-4 h-4" />;
      case 'citta': return <MapPin className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mercato': return 'Mercato';
      case 'hub': return 'Hub';
      case 'negozio': return 'Negozio';
      case 'servizio': return 'Servizio';
      case 'impresa': return 'Impresa';
      case 'vetrina': return 'Vetrina';
      case 'merceologia': return 'Merceologia';
      case 'citta': return 'Città';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Sfondo Italia con rete digitale */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
        style={{ backgroundImage: 'url(/italia-network.png)' }}
      />
      
      {/* Overlay gradiente */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />

      {/* Contenuto */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-primary/95 backdrop-blur-sm text-primary-foreground p-4 shadow-lg border-b border-primary/20">
          <div className="w-full px-4 md:px-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Store className="w-8 h-8" />
              <div>
                <h1 className="text-xl font-bold">DMS Hub</h1>
                <p className="text-xs opacity-90">Gemello Digitale del Commercio</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Presentazione - visibile SOLO per PA, nascosto su mobile (v4.3.4) */}
              {(permissionsLoading || canViewTab('dashboard')) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/presentazione')}
                  className="hidden sm:inline-flex bg-primary-foreground/10 border-primary-foreground/30 hover:bg-primary-foreground/20 text-primary-foreground"
                >
                  <Presentation className="w-4 h-4 mr-2" />
                  Presentazione
                </Button>
              )}
              {/* Dashboard PA - spostato nell'header, nascosto su mobile (v4.3.4) */}
              {(permissionsLoading || canViewTab('dashboard')) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => isAuthenticated ? setLocation('/dashboard-pa') : handleProtectedNavigation('/dashboard-pa')}
                  className="hidden sm:inline-flex bg-primary-foreground/10 border-primary-foreground/30 hover:bg-primary-foreground/20 text-primary-foreground"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard PA
                </Button>
              )}
{isAuthenticated ? (
                <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation('/profilo')}
                  className="bg-primary-foreground/10 border-primary-foreground/30 hover:bg-primary-foreground/20 text-primary-foreground"
                >
                  <User className="w-4 h-4 mr-2" />
                  Profilo
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    // Logout Firebase (se attivo)
                    try { await firebaseLogout(); } catch(e) { /* ignore */ }
                    // Pulisci tutti i localStorage di autenticazione
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    localStorage.removeItem('auth_token');
                    localStorage.removeItem('permissions');
                    localStorage.removeItem('miohub_firebase_user');
                    localStorage.removeItem('miohub_user_role');
                    localStorage.removeItem('miohub_session_token');
                    localStorage.removeItem('miohub_user_info');
                    setIsAuthenticated(false);
                    window.location.reload();
                  }}
                  className="bg-red-500/20 border-red-500/30 hover:bg-red-500/30 text-red-300"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Esci
                </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLoginModal(true)}
                  className="bg-primary-foreground/10 border-primary-foreground/30 hover:bg-primary-foreground/20 text-primary-foreground"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Accedi
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 space-y-4 sm:space-y-8">
          {/* Titolo */}
          <div className="text-center space-y-1 sm:space-y-3 max-w-2xl">
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-foreground">
              Rete Mercati <span className="text-primary">Made in Italy</span>
            </h2>
            <p className="text-sm sm:text-lg text-muted-foreground">
              Scopri mercati, hub e negozi sostenibili in tutta Italia
            </p>
          </div>

          {/* Barra di ricerca */}
          <div className="w-full max-w-2xl space-y-2 sm:space-y-4 px-2">
            <div className="flex gap-1 sm:gap-2">
              <Input
                type="text"
                placeholder="Cerca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 h-10 sm:h-14 text-sm sm:text-lg bg-card/90 backdrop-blur-sm border-primary/30 focus:border-primary"
              />
              <Button 
                size="lg" 
                onClick={handleSearch}
                className="h-10 sm:h-14 px-3 sm:px-6"
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5 sm:mr-2" />
                <span className="hidden sm:inline">Cerca</span>
              </Button>
            </div>

            {/* Risultati ricerca */}
            {showResults && (
              <Card className="bg-card/95 backdrop-blur-sm border-primary/20 max-h-96 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    Nessun risultato trovato
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full p-4 hover:bg-accent/50 transition-colors text-left flex items-start gap-3"
                      >
                        <div className="mt-1 text-primary">
                          {getTypeIcon(result.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-foreground">{result.name}</h3>
                            {result.isOpen && (
                              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                                Aperto
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {getTypeLabel(result.type)} • {result.city}
                            {result.mercato && ` • ${result.mercato}`}
                            {result.impresa && ` • ${result.impresa}`}
                            {result.distance && ` • ${result.distance.toFixed(1)} km`}
                          </p>
                          {result.descrizione && (
                            <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-1">
                              {result.descrizione}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Tab Pubblici - Riga 1: nascosti per utenti impresa/admin (vedono solo tab Impresa) */}
          {userRole !== 'business' && userRole !== 'admin' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap md:justify-center gap-2 sm:gap-4 w-full max-w-4xl px-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleProtectedNavigation('/mappa-italia')}
              className="h-16 sm:h-24 sm:w-36 flex-col gap-1 sm:gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
            >
              <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">Mappa</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleProtectedNavigation('/route')}
              className="h-16 sm:h-24 sm:w-36 flex-col gap-1 sm:gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
            >
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">Route</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleProtectedNavigation('/wallet')}
              className="h-16 sm:h-24 sm:w-36 flex-col gap-1 sm:gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
            >
              <Leaf className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">Wallet</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleProtectedNavigation('/civic')}
              className="h-16 sm:h-24 sm:w-36 flex-col gap-1 sm:gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
            >
              <Search className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">Segnala</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleProtectedNavigation('/vetrine')}
              className="h-16 sm:h-24 sm:w-36 flex-col gap-1 sm:gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30 col-span-2 sm:col-span-1"
            >
              <Store className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">Vetrine</span>
            </Button>
          </div>
          )}

          {/* Tab Impresa - Riga 2: visibile per utenti business, admin, o con permessi impresa */}
          {(userRole === 'business' || userRole === 'admin' || canViewTab('wallet_impresa')) && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap md:justify-center gap-2 sm:gap-4 w-full max-w-4xl px-2">
            {/* Wallet Impresa - pagamenti PagoPA */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleProtectedNavigation('/app/impresa/wallet')}
              className="h-16 sm:h-24 sm:w-36 flex-col gap-1 sm:gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
            >
              <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">Wallet Imp.</span>
            </Button>
            {/* Hub Operatore */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleProtectedNavigation('/hub-operatore')}
              className="h-16 sm:h-24 sm:w-36 flex-col gap-1 sm:gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
            >
              <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">Hub Op.</span>
            </Button>
            {/* Notifiche */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleProtectedNavigation('/app/impresa/notifiche')}
              className="h-16 sm:h-24 sm:w-36 flex-col gap-1 sm:gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30 relative"
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">Notifiche</span>
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </Button>
            {/* Anagrafica */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleProtectedNavigation('/app/impresa/anagrafica')}
              className="h-16 sm:h-24 sm:w-36 flex-col gap-1 sm:gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">Anagrafica</span>
            </Button>
            {/* Presenze - in fondo, grande come Vetrine (col-span-2 su mobile) */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleProtectedNavigation('/app/impresa/presenze')}
              className="h-16 sm:h-24 sm:w-36 flex-col gap-1 sm:gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30 col-span-2 sm:col-span-1"
            >
              <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">Presenze</span>
            </Button>
          </div>
          )}
        </main>

        {/* Footer globale gestito da App.tsx GlobalFooter */}
      </div>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal}
        redirectRoute={pendingRoute || '/'}
        onClose={() => {
          setShowLoginModal(false);
          setPendingRoute(null);
          // Ricontrolla autenticazione dopo chiusura modal
          const userStr = localStorage.getItem('user');
          const token = localStorage.getItem('token');
          if (userStr && token) {
            setIsAuthenticated(true);
          }
        }} 
      />
    </div>
  );
}
