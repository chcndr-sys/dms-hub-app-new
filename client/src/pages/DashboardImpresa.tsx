/**
 * Dashboard Impresa
 * Dashboard dedicata per gli utenti con ruolo business_owner
 * Mostra i dati dell'impresa collegata all'utente loggato
 */
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  User,
  FileText,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Shield,
  LogOut,
  Home,
  Briefcase,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { getCachedUser, logout, type User as AuthUser } from '@/api/authClient';
import { ORCHESTRATORE_API_BASE_URL, MIHUB_API_BASE_URL } from '@/config/api';
import { toast } from 'sonner';

/**
 * Recupera i dati utente da tutte le sorgenti localStorage disponibili.
 * Ordine di priorità:
 * 1. miohub_firebase_user (Firebase auth - MioHubUser con impresaId)
 * 2. user (legacy bridge - con impresa_id)
 * 3. miohub_user_info (ARPA auth - con fiscalCode)
 */
function getEffectiveUser(): { user: AuthUser | null; impresaId: number | null } {
  // 1. Firebase user (ha impresaId nel formato MioHubUser)
  try {
    const firebaseRaw = localStorage.getItem('miohub_firebase_user');
    if (firebaseRaw) {
      const fbUser = JSON.parse(firebaseRaw);
      return {
        user: {
          id: fbUser.miohubId || 0,
          email: fbUser.email || '',
          name: fbUser.displayName || fbUser.email || '',
          fiscalCode: fbUser.fiscalCode,
          authMethod: fbUser.provider,
        },
        impresaId: fbUser.impresaId || null,
      };
    }
  } catch { /* ignore */ }

  // 2. Legacy bridge user (ha impresa_id dal bridge FirebaseAuthContext)
  try {
    const legacyRaw = localStorage.getItem('user');
    if (legacyRaw) {
      const legacyUser = JSON.parse(legacyRaw);
      return {
        user: {
          id: legacyUser.id || 0,
          email: legacyUser.email || '',
          name: legacyUser.name || legacyUser.email || '',
          fiscalCode: legacyUser.fiscal_code || legacyUser.fiscalCode,
          authMethod: legacyUser.provider,
        },
        impresaId: legacyUser.impresa_id || null,
      };
    }
  } catch { /* ignore */ }

  // 3. ARPA auth user (getCachedUser da authClient.ts - legge miohub_user_info)
  const arpaUser = getCachedUser();
  if (arpaUser) {
    return { user: arpaUser, impresaId: null };
  }

  return { user: null, impresaId: null };
}

interface Impresa {
  id: number;
  denominazione: string;
  ragione_sociale?: string;
  partita_iva: string;
  codice_fiscale: string;
  forma_giuridica: string;
  sede_legale_indirizzo: string;
  sede_legale_comune: string;
  sede_legale_provincia: string;
  sede_legale_cap: string;
  pec: string;
  telefono: string;
  email: string;
  rappresentante_legale_nome: string;
  rappresentante_legale_cf: string;
  data_costituzione: string;
  stato: string;
  ateco_primario: string;
  ateco_descrizione: string;
  capitale_sociale: number;
  numero_dipendenti: number;
  fatturato_ultimo_anno: number;
  created_at: string;
  updated_at: string;
}

interface Pratica {
  id: number;
  numero_pratica: string;
  tipo: string;
  stato: string;
  data_presentazione: string;
  data_ultimo_aggiornamento: string;
}

export default function DashboardImpresa() {
  const [, navigate] = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [impresa, setImpresa] = useState<Impresa | null>(null);
  const [pratiche, setPratiche] = useState<Pratica[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const loadData = async () => {
      // Recupera utente da tutte le sorgenti (Firebase, bridge, ARPA)
      const { user: effectiveUser, impresaId } = getEffectiveUser();
      if (!effectiveUser) {
        navigate('/login');
        return;
      }
      setUser(effectiveUser);

      // Carica dati impresa con fallback multipli
      try {
        let impresaData: Impresa | null = null;

        // Strategia 1: Carica impresa direttamente per ID (dal bridge Firebase)
        if (impresaId) {
          try {
            const response = await fetch(
              `${MIHUB_API_BASE_URL}/api/imprese/${impresaId}`
            );
            if (response.ok) {
              const data = await response.json();
              const raw = data.success ? data.data : data;
              if (raw && raw.id) {
                impresaData = {
                  ...raw,
                  denominazione: raw.denominazione || raw.ragione_sociale || 'N/D',
                };
              }
            }
          } catch (err) {
            console.warn('[DashboardImpresa] Lookup per ID su MIHUB fallito:', err);
          }
        }

        // Strategia 2: Cerca per ID su orchestratore
        if (!impresaData && impresaId) {
          try {
            const response = await fetch(
              `${ORCHESTRATORE_API_BASE_URL}/api/imprese/${impresaId}`
            );
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data) {
                impresaData = data.data;
              }
            }
          } catch (err) {
            console.warn('[DashboardImpresa] Lookup per ID su orchestratore fallito:', err);
          }
        }

        // Strategia 3: RIMOSSA - La ricerca per email è stata rimossa perché l'email
        // dell'impresa è l'email DI CONTATTO dell'azienda, NON l'email del proprietario.
        // Cercando per email si associavano erroneamente imprese a utenti cittadini
        // che condividevano la stessa email (es. checchi@me.com era email di contatto
        // dell'impresa Alimentare Rossi, ma l'utente è un cittadino).
        // Il match corretto avviene tramite impresa_id (Strategia 1-2) o user_id (Strategia 5).

        // Strategia 4: Cerca per codice fiscale su orchestratore (fallback originale)
        if (!impresaData && effectiveUser.fiscalCode) {
          try {
            const response = await fetch(
              `${ORCHESTRATORE_API_BASE_URL}/api/imprese?rappresentante_legale_cf=${effectiveUser.fiscalCode}`
            );
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data && data.data.length > 0) {
                impresaData = data.data[0];
              }
            }
          } catch (err) {
            console.warn('[DashboardImpresa] Lookup per CF fallito:', err);
          }
        }

        // Strategia 5: Cerca per user_id su orchestratore
        if (!impresaData && effectiveUser.id) {
          try {
            const response = await fetch(
              `${ORCHESTRATORE_API_BASE_URL}/api/imprese?user_id=${effectiveUser.id}`
            );
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.data && data.data.length > 0) {
                impresaData = data.data[0];
              }
            }
          } catch (err) {
            console.warn('[DashboardImpresa] Lookup per user_id fallito:', err);
          }
        }

        if (impresaData) {
          setImpresa(impresaData);

          // Carica pratiche dell'impresa
          try {
            const praticheResponse = await fetch(
              `${ORCHESTRATORE_API_BASE_URL}/api/suap/pratiche?impresa_id=${impresaData.id}`
            );
            if (praticheResponse.ok) {
              const praticheData = await praticheResponse.json();
              if (praticheData.success) {
                setPratiche(praticheData.data || []);
              }
            }
          } catch (err) {
            console.warn('[DashboardImpresa] Caricamento pratiche fallito:', err);
          }
        }
      } catch (error) {
        console.error('Errore caricamento dati impresa:', error);
        toast.error('Errore nel caricamento dei dati');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto text-teal-500 animate-spin" />
          <p className="mt-4 text-gray-400">Caricamento dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700 px-2 sm:px-6 py-3 sm:py-4">
        <div className="w-full sm:px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-teal-500" />
            <div>
              <h1 className="text-base sm:text-xl font-bold text-white">Dashboard Impresa</h1>
              <p className="text-sm text-gray-400">
                {impresa?.denominazione || impresa?.ragione_sociale || 'Nessuna impresa collegata'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
              className="border-slate-600 text-gray-300 hover:bg-slate-700 px-2 sm:px-3"
            >
              <Home className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Home</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-red-500/50 text-red-400 hover:bg-red-500/10 px-2 sm:px-3"
            >
              <LogOut className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Esci</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-1 sm:px-4 py-3 sm:py-6">
        {!impresa ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Nessuna impresa collegata
              </h2>
              <p className="text-gray-400 mb-6">
                Il tuo account ({user?.email}) non è associato a nessuna impresa nel sistema.
              </p>
              <Button
                onClick={() => navigate('/suap')}
                className="bg-teal-500 hover:bg-teal-600"
              >
                <FileText className="h-4 w-4 mr-2" />
                Registra la tua impresa
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-slate-800/50 border border-slate-700 mb-4 sm:mb-6 w-full sm:w-auto overflow-x-auto">
              <TabsTrigger value="overview">
                <Building2 className="h-4 w-4 mr-2" />
                Panoramica
              </TabsTrigger>
              <TabsTrigger value="pratiche">
                <FileText className="h-4 w-4 mr-2" />
                Pratiche SUAP
              </TabsTrigger>
              <TabsTrigger value="documenti">
                <Briefcase className="h-4 w-4 mr-2" />
                Documenti
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
                <Card className="bg-gradient-to-br from-teal-500/20 to-teal-600/10 border-teal-500/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm text-gray-400">Stato Impresa</p>
                        <p className="text-lg sm:text-2xl font-bold text-white mt-1">
                          {impresa.stato || 'Attiva'}
                        </p>
                      </div>
                      <CheckCircle2 className="h-7 w-7 sm:h-10 sm:w-10 text-teal-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm text-gray-400">Pratiche Attive</p>
                        <p className="text-lg sm:text-2xl font-bold text-white mt-1">
                          {pratiche.filter(p => p.stato !== 'completata').length}
                        </p>
                      </div>
                      <FileText className="h-7 w-7 sm:h-10 sm:w-10 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm text-gray-400">Dipendenti</p>
                        <p className="text-lg sm:text-2xl font-bold text-white mt-1">
                          {impresa.numero_dipendenti || 0}
                        </p>
                      </div>
                      <User className="h-7 w-7 sm:h-10 sm:w-10 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs sm:text-sm text-gray-400">Capitale Sociale</p>
                        <p className="text-lg sm:text-2xl font-bold text-white mt-1">
                          €{(impresa.capitale_sociale || 0).toLocaleString()}
                        </p>
                      </div>
                      <Award className="h-7 w-7 sm:h-10 sm:w-10 text-amber-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Dettagli Impresa */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-teal-500" />
                      Dati Aziendali
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Denominazione</p>
                        <p className="text-white font-medium">{impresa.denominazione || impresa.ragione_sociale}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Forma Giuridica</p>
                        <p className="text-white">{impresa.forma_giuridica || 'N/D'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Partita IVA</p>
                        <p className="text-white font-mono">{impresa.partita_iva}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Codice Fiscale</p>
                        <p className="text-white font-mono">{impresa.codice_fiscale}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">ATECO</p>
                        <p className="text-white">{impresa.ateco_primario || 'N/D'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Data Costituzione</p>
                        <p className="text-white">
                          {impresa.data_costituzione 
                            ? new Date(impresa.data_costituzione).toLocaleDateString('it-IT')
                            : 'N/D'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-teal-500" />
                      Sede e Contatti
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-gray-500">Sede Legale</p>
                      <p className="text-white">
                        {impresa.sede_legale_indirizzo || 'N/D'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {impresa.sede_legale_cap} {impresa.sede_legale_comune} ({impresa.sede_legale_provincia})
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:gap-4">
                      <div>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" /> PEC
                        </p>
                        <p className="text-white text-sm">{impresa.pec || 'N/D'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Phone className="h-3 w-3" /> Telefono
                        </p>
                        <p className="text-white text-sm">{impresa.telefono || 'N/D'}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Rappresentante Legale</p>
                      <p className="text-white">{impresa.rappresentante_legale_nome || 'N/D'}</p>
                      <p className="text-gray-400 text-sm font-mono">
                        CF: {impresa.rappresentante_legale_cf || 'N/D'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Pratiche Tab */}
            <TabsContent value="pratiche" className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">Pratiche SUAP</h2>
                <Button
                  onClick={() => navigate('/suap')}
                  className="bg-teal-500 hover:bg-teal-600"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Nuova Pratica
                </Button>
              </div>

              {pratiche.length === 0 ? (
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardContent className="py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                    <p className="text-gray-400">Nessuna pratica presente</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pratiche.map((pratica) => (
                    <Card 
                      key={pratica.id} 
                      className="bg-slate-800/50 border-slate-700 hover:border-teal-500/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/suap/detail/${pratica.id}`)}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-teal-500" />
                            </div>
                            <div>
                              <p className="font-medium text-white">{pratica.numero_pratica}</p>
                              <p className="text-sm text-gray-400">{pratica.tipo}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge
                              variant="outline"
                              className={
                                pratica.stato === 'completata'
                                  ? 'border-green-500/50 text-green-400'
                                  : pratica.stato === 'in_lavorazione'
                                  ? 'border-blue-500/50 text-blue-400'
                                  : 'border-yellow-500/50 text-yellow-400'
                              }
                            >
                              {pratica.stato}
                            </Badge>
                            <div className="text-right text-sm">
                              <p className="text-gray-400">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {new Date(pratica.data_presentazione).toLocaleDateString('it-IT')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Documenti Tab */}
            <TabsContent value="documenti" className="space-y-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-12 text-center">
                  <Briefcase className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                  <p className="text-gray-400">Sezione documenti in arrivo</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Qui potrai gestire tutti i documenti della tua impresa
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
