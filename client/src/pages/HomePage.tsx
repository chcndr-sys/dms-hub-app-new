import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import LoginModal from '@/components/LoginModal';
import { usePermissions } from '@/contexts/PermissionsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { 
  Search, MapPin, Store, Building2, Leaf, TrendingUp, BarChart3, LogIn,
  Bell, Wallet, Activity, ClipboardList, Menu
} from 'lucide-react';
import { geoAPI } from '@/utils/api';

interface SearchResult {
  id: string;
  name: string;
  type: 'mercato' | 'hub' | 'negozio' | 'servizio';
  city: string;
  distance: number;
  isOpen: boolean;
  lat: number;
  lng: number;
}

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  
  // Permessi utente per controllare visibilità tab
  const { canViewTab, loading: permissionsLoading } = usePermissions();

  // Controlla autenticazione all'avvio
  useEffect(() => {
    const checkAuth = () => {
      const userStr = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!(userStr && token));
    };
    checkAuth();
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, []);

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
        .sort((a, b) => a.distance - b.distance);
      setSearchResults(filtered);
      setShowResults(true);
      return;
    }

    // Mappa risultati API al formato locale
    const mapped = data.results.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type as 'mercato' | 'hub' | 'negozio' | 'servizio',
      city: r.address?.split(',')[1]?.trim() || 'N/A',
      distance: r.distance / 1000, // metri -> km
      isOpen: r.isOpen,
      lat: r.lat,
      lng: r.lng,
    }));
    
    const filtered = mapped;

    setSearchResults(filtered);
    setShowResults(true);
  };

  const handleResultClick = (result: SearchResult) => {
    // Naviga alla MapPage con parametri
    setLocation(`/mappa?lat=${result.lat}&lng=${result.lng}&zoom=15&id=${result.id}`);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'mercato': return <Store className="w-4 h-4" />;
      case 'hub': return <Building2 className="w-4 h-4" />;
      case 'negozio': return <MapPin className="w-4 h-4" />;
      case 'servizio': return <TrendingUp className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
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
              {/* Dashboard PA - spostato nell'header (v3.70.0) */}
              {(permissionsLoading || canViewTab('dashboard')) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => isAuthenticated ? setLocation('/dashboard-pa') : handleProtectedNavigation('/dashboard-pa')}
                  className="bg-primary-foreground/10 border-primary-foreground/30 hover:bg-primary-foreground/20 text-primary-foreground"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Dashboard PA
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLoginModal(true)}
                className="bg-primary-foreground/10 border-primary-foreground/30 hover:bg-primary-foreground/20 text-primary-foreground"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Accedi
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 space-y-8">
          {/* Titolo */}
          <div className="text-center space-y-3 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Rete Mercati <span className="text-primary">Made in Italy</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Scopri mercati, hub e negozi sostenibili in tutta Italia
            </p>
          </div>

          {/* Barra di ricerca */}
          <div className="w-full max-w-2xl space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Cerca mercato, hub, città, azienda, servizio..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1 h-14 text-lg bg-card/90 backdrop-blur-sm border-primary/30 focus:border-primary"
              />
              <Button 
                size="lg" 
                onClick={handleSearch}
                className="h-14 px-6"
              >
                <Search className="w-5 h-5 mr-2" />
                Cerca
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
                            {result.type.charAt(0).toUpperCase() + result.type.slice(1)} • {result.city} • {result.distance} km
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Tab Pubblici - Riga 1 (v3.70.0) */}
          <div className="flex flex-wrap justify-center gap-4 w-full max-w-4xl">
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleProtectedNavigation('/mappa-italia')}
              className="h-24 w-36 flex-col gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
            >
              <MapPin className="w-6 h-6" />
              <span>Mappa</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleProtectedNavigation('/route')}
              className="h-24 w-36 flex-col gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
            >
              <TrendingUp className="w-6 h-6" />
              <span>Route</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleProtectedNavigation('/wallet')}
              className="h-24 w-36 flex-col gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
            >
              <Leaf className="w-6 h-6" />
              <span>Wallet</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleProtectedNavigation('/civic')}
              className="h-24 w-36 flex-col gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
            >
              <Search className="w-6 h-6" />
              <span>Segnala</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => handleProtectedNavigation('/vetrine')}
              className="h-24 w-36 flex-col gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
            >
              <Store className="w-6 h-6" />
              <span>Vetrine</span>
            </Button>
          </div>

          {/* Tab Impresa - Riga 2 (v3.70.0) */}
          <div className="flex flex-wrap justify-center gap-4 w-full max-w-4xl">
            {/* Presenze - apre app Heroku */}
            {(permissionsLoading || canViewTab('presenze')) && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleProtectedNavigation('/app/impresa/presenze')}
                className="h-24 w-36 flex-col gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
              >
                <ClipboardList className="w-6 h-6" />
                <span>Presenze</span>
              </Button>
            )}
            {/* Wallet Impresa - pagamenti PagoPA */}
            {(permissionsLoading || canViewTab('wallet_impresa')) && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleProtectedNavigation('/app/impresa/wallet')}
                className="h-24 w-36 flex-col gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
              >
                <Wallet className="w-6 h-6" />
                <span>Wallet Impresa</span>
              </Button>
            )}
            {/* Hub Operatore - già esistente */}
            {(permissionsLoading || canViewTab('hub_operatore')) && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleProtectedNavigation('/hub-operatore')}
                className="h-24 w-36 flex-col gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
              >
                <Activity className="w-6 h-6" />
                <span>Hub Operatore</span>
              </Button>
            )}
            {/* Notifiche - già esistente */}
            {(permissionsLoading || canViewTab('notifiche')) && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleProtectedNavigation('/app/impresa/notifiche')}
                className="h-24 w-36 flex-col gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
              >
                <Bell className="w-6 h-6" />
                <span>Notifiche</span>
              </Button>
            )}
            {/* Anagrafica - placeholder per sviluppi futuri */}
            {(permissionsLoading || canViewTab('anagrafica')) && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleProtectedNavigation('/app/impresa/anagrafica')}
                className="h-24 w-36 flex-col gap-2 bg-card/80 backdrop-blur-sm hover:bg-primary/20 border-primary/30"
              >
                <Menu className="w-6 h-6" />
                <span>Anagrafica</span>
              </Button>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="p-4 text-center text-sm text-muted-foreground">
          <p>PA Digitale 2026 • Cloud First • Rete Mercati Made in Italy</p>
        </footer>
      </div>

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => {
          setShowLoginModal(false);
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
