import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bell, Mail, MessageSquare, Send, RefreshCw, 
  ArrowDownLeft, ArrowUpRight, Phone, Loader2, Search, Building2, X, Landmark,
  Filter, Eye, Calendar, ChevronDown
} from 'lucide-react';
import { addComuneIdToUrl, getImpersonationParams, authenticatedFetch } from '@/hooks/useImpersonation';
import { MIHUB_API_BASE_URL } from '@/config/api';
import { formatDateTime as formatDate } from '@/lib/formatUtils';

const BACKEND_URL = MIHUB_API_BASE_URL;
const API_BASE_URL = MIHUB_API_BASE_URL;

interface Notification {
  id: string;
  direction: 'received' | 'sent';
  type: 'email' | 'whatsapp' | 'other';
  from?: string;
  to?: string;
  subject?: string;
  message: string;
  date: string;
  meta?: any;
}

interface NotificationStats {
  received: number;
  sent: number;
  emails: number;
  whatsapp: number;
}

interface Impresa {
  id: number;
  denominazione: string;
  codice_fiscale: string;
  email?: string;
  telefono?: string;
  stato_impresa?: string;
}

interface SettoreComune {
  id: number;
  comune_id: number;
  comune_nome?: string;
  tipo_settore: string;
  nome_settore?: string;
  responsabile_nome?: string;
  responsabile_cognome?: string;
  email?: string;
  pec?: string;
  telefono?: string;
}

interface Comune {
  id: number;
  nome: string;
  provincia: string;
}

// Mappa tipi settore per label leggibili
const TIPI_SETTORE_LABELS: { [key: string]: string } = {
  'SUAP': 'SUAP - Sportello Unico Attività Produttive',
  'POLIZIA_LOCALE': 'Polizia Locale / Municipale',
  'TRIBUTI': 'Ufficio Tributi',
  'DEMOGRAFICI': 'Servizi Demografici (SED)',
  'COMMERCIO': 'Ufficio Commercio',
  'TECNICO': 'Ufficio Tecnico',
  'RAGIONERIA': 'Ragioneria / Bilancio',
  'AMBIENTE': 'Ambiente / Ecologia',
  'SEGRETERIA': 'Segreteria Generale',
  'URP': 'URP - Relazioni con il Pubblico',
  'PROTEZIONE_CIVILE': 'Protezione Civile',
};

export function NotificationsPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats>({ received: 0, sent: 0, emails: 0, whatsapp: 0 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'compose'>('all');
  
  // Form state
  const [sendType, setSendType] = useState<'email' | 'whatsapp'>('email');
  const [sendTo, setSendTo] = useState('');
  const [sendSubject, setSendSubject] = useState('');
  const [sendBody, setSendBody] = useState('');
  const [sendStatus, setSendStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtri notifiche
  const [notifSearchQuery, setNotifSearchQuery] = useState('');
  const [notifFilterType, setNotifFilterType] = useState<'all' | 'email' | 'whatsapp'>('all');
  const [notifFilterDirection, setNotifFilterDirection] = useState<'all' | 'received' | 'sent'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Modal visualizzazione notifica
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  // Tipo di ricerca: imprese o comuni
  const [searchEntityType, setSearchEntityType] = useState<'imprese' | 'comuni'>('imprese');

  // Ricerca imprese
  const [imprese, setImprese] = useState<Impresa[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedImpresa, setSelectedImpresa] = useState<Impresa | null>(null);
  const [loadingImprese, setLoadingImprese] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ricerca settori comunali
  const [settoriComuni, setSettoriComuni] = useState<SettoreComune[]>([]);
  const [comuni, setComuni] = useState<Comune[]>([]);
  const [selectedSettore, setSelectedSettore] = useState<SettoreComune | null>(null);
  const [loadingSettori, setLoadingSettori] = useState(false);

  // Carica lista imprese
  useEffect(() => {
    const fetchImprese = async () => {
      setLoadingImprese(true);
      try {
        // v3.90.0: Filtro per comune_id durante impersonificazione
        const response = await fetch(addComuneIdToUrl(`${API_BASE_URL}/api/imprese`));
        const data = await response.json();
        if (data.success && data.data) {
          setImprese(data.data);
        }
      } catch (error) {
        console.error('Error fetching imprese:', error);
      } finally {
        setLoadingImprese(false);
      }
    };
    fetchImprese();
  }, []);

  // Carica lista comuni e settori (filtrata per comune durante impersonazione)
  useEffect(() => {
    const fetchComuniAndSettori = async () => {
      setLoadingSettori(true);
      try {
        // Carica comuni — filtra per comune_id durante impersonazione
        const comuniRes = await fetch(addComuneIdToUrl(`${API_BASE_URL}/api/comuni`));
        const comuniData = await comuniRes.json();
        if (comuniData.success && comuniData.data) {
          setComuni(comuniData.data);

          // Carica settori per ogni comune
          const allSettori: SettoreComune[] = [];
          for (const comune of comuniData.data) {
            try {
              const settoriRes = await fetch(addComuneIdToUrl(`${API_BASE_URL}/api/comuni/${comune.id}/settori`));
              const settoriData = await settoriRes.json();
              if (settoriData.success && settoriData.data) {
                // Aggiungi il nome del comune a ogni settore
                const settoriWithComune = settoriData.data.map((s: SettoreComune) => ({
                  ...s,
                  comune_nome: comune.nome
                }));
                allSettori.push(...settoriWithComune);
              }
            } catch (err) {
              console.error(`Error fetching settori for comune ${comune.id}:`, err);
            }
          }
          setSettoriComuni(allSettori);
        }
      } catch (error) {
        console.error('Error fetching comuni:', error);
      } finally {
        setLoadingSettori(false);
      }
    };
    fetchComuniAndSettori();
  }, []);

  // Chiudi dropdown quando clicchi fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtra imprese in base alla ricerca
  const filteredImprese = imprese.filter(imp => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      imp.denominazione?.toLowerCase().includes(query) ||
      imp.codice_fiscale?.toLowerCase().includes(query) ||
      imp.email?.toLowerCase().includes(query)
    );
  });

  // Filtra settori comunali in base alla ricerca
  const filteredSettori = settoriComuni.filter(settore => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const tipoLabel = TIPI_SETTORE_LABELS[settore.tipo_settore] || settore.tipo_settore;
    return (
      settore.comune_nome?.toLowerCase().includes(query) ||
      tipoLabel.toLowerCase().includes(query) ||
      settore.responsabile_nome?.toLowerCase().includes(query) ||
      settore.responsabile_cognome?.toLowerCase().includes(query) ||
      settore.email?.toLowerCase().includes(query) ||
      settore.pec?.toLowerCase().includes(query)
    );
  });

  // Seleziona impresa
  const handleSelectImpresa = (impresa: Impresa) => {
    setSelectedImpresa(impresa);
    setSelectedSettore(null);
    setSearchQuery(impresa.denominazione);
    setShowDropdown(false);
    
    // Auto-popola il campo destinatario
    if (sendType === 'email' && impresa.email) {
      setSendTo(impresa.email);
    } else if (sendType === 'whatsapp' && impresa.telefono) {
      setSendTo(impresa.telefono);
    }
  };

  // Seleziona settore comunale
  const handleSelectSettore = (settore: SettoreComune) => {
    setSelectedSettore(settore);
    setSelectedImpresa(null);
    const tipoLabel = TIPI_SETTORE_LABELS[settore.tipo_settore] || settore.tipo_settore;
    setSearchQuery(`${settore.comune_nome} - ${tipoLabel}`);
    setShowDropdown(false);
    
    // Auto-popola il campo destinatario (preferisci PEC per i comuni)
    if (sendType === 'email') {
      setSendTo(settore.pec || settore.email || '');
    } else if (sendType === 'whatsapp' && settore.telefono) {
      setSendTo(settore.telefono);
    }
  };

  // Quando cambia il tipo di invio, aggiorna il destinatario
  useEffect(() => {
    if (selectedImpresa) {
      if (sendType === 'email' && selectedImpresa.email) {
        setSendTo(selectedImpresa.email);
      } else if (sendType === 'whatsapp' && selectedImpresa.telefono) {
        setSendTo(selectedImpresa.telefono);
      }
    } else if (selectedSettore) {
      if (sendType === 'email') {
        setSendTo(selectedSettore.pec || selectedSettore.email || '');
      } else if (sendType === 'whatsapp' && selectedSettore.telefono) {
        setSendTo(selectedSettore.telefono);
      }
    }
  }, [sendType, selectedImpresa, selectedSettore]);

  // Reset selezione
  const handleClearSelection = () => {
    setSelectedImpresa(null);
    setSelectedSettore(null);
    setSearchQuery('');
    setSendTo('');
  };

  // Quando cambia il tipo di entità, resetta la ricerca
  const handleEntityTypeChange = (type: 'imprese' | 'comuni') => {
    setSearchEntityType(type);
    handleClearSelection();
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // v3.90.0: Filtro per comune_id durante impersonificazione
      const response = await fetch(addComuneIdToUrl(`${BACKEND_URL}/api/mihub/notifications/all`));
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.data.notifications);
        
        // Calcola statistiche
        const received = data.data.notifications.filter((n: Notification) => n.direction === 'received').length;
        const sent = data.data.notifications.filter((n: Notification) => n.direction === 'sent').length;
        const emails = data.data.notifications.filter((n: Notification) => n.type === 'email').length;
        const whatsapp = data.data.notifications.filter((n: Notification) => n.type === 'whatsapp').length;
        
        setStats({ received, sent, emails, whatsapp });
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Auto-refresh ogni 30 secondi
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    if (!sendTo) {
      setSendStatus({ type: 'error', message: 'Inserisci un destinatario' });
      return;
    }
    if (sendType === 'email' && !sendSubject) {
      setSendStatus({ type: 'error', message: 'Inserisci un oggetto per l\'email' });
      return;
    }

    try {
      setSending(true);
      setSendStatus(null);
      
      const response = await authenticatedFetch(`${BACKEND_URL}/api/mihub/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: sendType,
          to: sendTo,
          subject: sendSubject,
          body: sendBody
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSendStatus({ type: 'success', message: `${sendType === 'email' ? 'Email' : 'WhatsApp'} inviato con successo!` });
        // Reset form
        handleClearSelection();
        setSendSubject('');
        setSendBody('');
        // Refresh lista
        fetchNotifications();
      } else {
        setSendStatus({ type: 'error', message: data.error || 'Errore durante l\'invio' });
      }
    } catch (error) {
      setSendStatus({ type: 'error', message: 'Errore di connessione' });
    } finally {
      setSending(false);
    }
  };

  // Filtra notifiche
  const filteredNotifications = notifications.filter(notif => {
    // Filtro per tipo
    if (notifFilterType !== 'all' && notif.type !== notifFilterType) return false;
    // Filtro per direzione
    if (notifFilterDirection !== 'all' && notif.direction !== notifFilterDirection) return false;
    // Filtro per ricerca testuale
    if (notifSearchQuery) {
      const query = notifSearchQuery.toLowerCase();
      const matchFrom = notif.from?.toLowerCase().includes(query);
      const matchTo = notif.to?.toLowerCase().includes(query);
      const matchSubject = notif.subject?.toLowerCase().includes(query);
      const matchMessage = notif.message?.toLowerCase().includes(query);
      if (!matchFrom && !matchTo && !matchSubject && !matchMessage) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#ec4899]/20 to-[#ec4899]/5 border-[#ec4899]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4" />
              Ricevute
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#ec4899]">{stats.received}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#10b981]/20 to-[#10b981]/5 border-[#10b981]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Inviate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#10b981]">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#06b6d4]/20 to-[#06b6d4]/5 border-[#06b6d4]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#06b6d4]">{stats.emails}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-[#22c55e]/20 to-[#22c55e]/5 border-[#22c55e]/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-[#e8fbff] text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-[#22c55e]">{stats.whatsapp}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        <Button
          variant={activeTab === 'all' ? 'default' : 'outline'}
          onClick={() => setActiveTab('all')}
          className={activeTab === 'all' ? 'bg-[#ec4899] hover:bg-[#ec4899]/80' : ''}
        >
          <Bell className="h-4 w-4 mr-2" />
          Tutte le Notifiche
        </Button>
        <Button
          variant={activeTab === 'compose' ? 'default' : 'outline'}
          onClick={() => setActiveTab('compose')}
          className={activeTab === 'compose' ? 'bg-[#10b981] hover:bg-[#10b981]/80' : ''}
        >
          <Send className="h-4 w-4 mr-2" />
          Nuova Notifica
        </Button>
        <Button
          variant="outline"
          onClick={fetchNotifications}
          disabled={loading}
          className="ml-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Modal Visualizzazione Notifica */}
      {selectedNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-[#ec4899]/30 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-[#ec4899]/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {selectedNotification.type === 'email' ? (
                  <Mail className="h-5 w-5 text-[#06b6d4]" />
                ) : (
                  <MessageSquare className="h-5 w-5 text-[#22c55e]" />
                )}
                <span className="text-[#e8fbff] font-semibold">
                  {selectedNotification.type === 'email' ? 'Email' : 'WhatsApp'}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  selectedNotification.direction === 'received' 
                    ? 'bg-[#ec4899]/20 text-[#ec4899]' 
                    : 'bg-[#10b981]/20 text-[#10b981]'
                }`}>
                  {selectedNotification.direction === 'received' ? 'RICEVUTA' : 'INVIATA'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedNotification(null)}
                className="text-[#e8fbff]/70 hover:text-[#e8fbff]"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto max-h-[60vh]">
              <div className="flex items-center gap-2 text-sm">
                {selectedNotification.direction === 'received' ? (
                  <><ArrowDownLeft className="h-4 w-4 text-[#ec4899]" /><span className="text-[#e8fbff]/70">Da:</span></>
                ) : (
                  <><ArrowUpRight className="h-4 w-4 text-[#10b981]" /><span className="text-[#e8fbff]/70">A:</span></>
                )}
                <span className="text-[#e8fbff] font-medium">
                  {selectedNotification.direction === 'received' 
                    ? selectedNotification.from || 'Sconosciuto'
                    : selectedNotification.to || 'Sconosciuto'
                  }
                </span>
              </div>
              {selectedNotification.subject && (
                <div className="text-sm">
                  <span className="text-[#e8fbff]/70">Oggetto: </span>
                  <span className="text-[#e8fbff] font-medium">{selectedNotification.subject}</span>
                </div>
              )}
              <div className="text-sm text-[#e8fbff]/70 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(selectedNotification.date)}
              </div>
              <div className="border-t border-[#ec4899]/20 pt-3">
                <div className="text-[#e8fbff]/70 text-sm mb-2">Messaggio:</div>
                <div className="text-[#e8fbff] bg-[#0b1220] p-4 rounded-lg whitespace-pre-wrap">
                  {selectedNotification.message}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'all' ? (
        <Card className="bg-[#1a2332] border-[#ec4899]/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-[#e8fbff]">Notifiche Recenti</CardTitle>
              <div className="text-sm text-[#e8fbff]/50">
                {filteredNotifications.length} di {notifications.length} notifiche
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Barra di ricerca e filtri */}
            <div className="mb-4 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#e8fbff]/50" />
                  <Input
                    placeholder="Cerca per mittente, destinatario, oggetto o messaggio..."
                    value={notifSearchQuery}
                    onChange={(e) => setNotifSearchQuery(e.target.value)}
                    className="pl-10 bg-[#0b1220] border-[#ec4899]/30 text-[#e8fbff]"
                  />
                  {notifSearchQuery && (
                    <button
                      onClick={() => setNotifSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#e8fbff]/50 hover:text-[#e8fbff]"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? 'bg-[#ec4899]/20 border-[#ec4899]' : ''}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtri
                  <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </Button>
              </div>

              {/* Filtri espandibili */}
              {showFilters && (
                <div className="flex flex-wrap gap-2 p-3 bg-[#0b1220] rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-[#e8fbff]/70 text-sm">Tipo:</span>
                    <Button
                      size="sm"
                      variant={notifFilterType === 'all' ? 'default' : 'outline'}
                      onClick={() => setNotifFilterType('all')}
                      className={notifFilterType === 'all' ? 'bg-[#ec4899] hover:bg-[#ec4899]/80' : ''}
                    >
                      Tutti
                    </Button>
                    <Button
                      size="sm"
                      variant={notifFilterType === 'email' ? 'default' : 'outline'}
                      onClick={() => setNotifFilterType('email')}
                      className={notifFilterType === 'email' ? 'bg-[#06b6d4] hover:bg-[#06b6d4]/80' : ''}
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Email
                    </Button>
                    <Button
                      size="sm"
                      variant={notifFilterType === 'whatsapp' ? 'default' : 'outline'}
                      onClick={() => setNotifFilterType('whatsapp')}
                      className={notifFilterType === 'whatsapp' ? 'bg-[#22c55e] hover:bg-[#22c55e]/80' : ''}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      WhatsApp
                    </Button>
                  </div>
                  <div className="w-px bg-[#e8fbff]/20 mx-2" />
                  <div className="flex items-center gap-2">
                    <span className="text-[#e8fbff]/70 text-sm">Direzione:</span>
                    <Button
                      size="sm"
                      variant={notifFilterDirection === 'all' ? 'default' : 'outline'}
                      onClick={() => setNotifFilterDirection('all')}
                      className={notifFilterDirection === 'all' ? 'bg-[#ec4899] hover:bg-[#ec4899]/80' : ''}
                    >
                      Tutte
                    </Button>
                    <Button
                      size="sm"
                      variant={notifFilterDirection === 'received' ? 'default' : 'outline'}
                      onClick={() => setNotifFilterDirection('received')}
                      className={notifFilterDirection === 'received' ? 'bg-[#ec4899] hover:bg-[#ec4899]/80' : ''}
                    >
                      <ArrowDownLeft className="h-3 w-3 mr-1" />
                      Ricevute
                    </Button>
                    <Button
                      size="sm"
                      variant={notifFilterDirection === 'sent' ? 'default' : 'outline'}
                      onClick={() => setNotifFilterDirection('sent')}
                      className={notifFilterDirection === 'sent' ? 'bg-[#10b981] hover:bg-[#10b981]/80' : ''}
                    >
                      <ArrowUpRight className="h-3 w-3 mr-1" />
                      Inviate
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#ec4899]" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-[#e8fbff]/50">
                {notifications.length === 0 ? 'Nessuna notifica trovata' : 'Nessuna notifica corrisponde ai filtri'}
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredNotifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className="p-4 bg-[#0b1220] rounded-lg cursor-pointer hover:bg-[#0b1220]/80 hover:border-[#ec4899]/50 border border-transparent transition-all"
                    onClick={() => setSelectedNotification(notif)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {notif.direction === 'received' ? (
                          <ArrowDownLeft className="h-4 w-4 text-[#ec4899]" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-[#10b981]" />
                        )}
                        <div className="text-[#e8fbff] font-semibold">
                          {notif.direction === 'received' 
                            ? `Da: ${notif.from || 'Sconosciuto'}`
                            : `A: ${notif.to || 'Sconosciuto'}`
                          }
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-2 py-1 rounded text-xs ${
                          notif.type === 'email' ? 'bg-[#06b6d4]/20 text-[#06b6d4]' :
                          notif.type === 'whatsapp' ? 'bg-[#22c55e]/20 text-[#22c55e]' :
                          'bg-[#8b5cf6]/20 text-[#8b5cf6]'
                        }`}>
                          {notif.type === 'email' ? 'EMAIL' : notif.type === 'whatsapp' ? 'WHATSAPP' : 'ALTRO'}
                        </div>
                        <div className={`px-2 py-1 rounded text-xs ${
                          notif.direction === 'received' 
                            ? 'bg-[#ec4899]/20 text-[#ec4899]' 
                            : 'bg-[#10b981]/20 text-[#10b981]'
                        }`}>
                          {notif.direction === 'received' ? 'RICEVUTA' : 'INVIATA'}
                        </div>
                        <Eye className="h-4 w-4 text-[#e8fbff]/30" />
                      </div>
                    </div>
                    {notif.subject && (
                      <div className="text-[#e8fbff]/80 text-sm mb-1">
                        <strong>Oggetto:</strong> {notif.subject}
                      </div>
                    )}
                    <div className="text-[#e8fbff]/70 text-sm line-clamp-2">
                      {notif.message}
                    </div>
                    <div className="text-[#e8fbff]/50 text-xs mt-2">
                      {formatDate(notif.date)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-[#1a2332] border-[#10b981]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff]">Componi Nuova Notifica</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo di notifica */}
            <div className="flex gap-2">
              <Button
                variant={sendType === 'email' ? 'default' : 'outline'}
                onClick={() => setSendType('email')}
                className={sendType === 'email' ? 'bg-[#06b6d4] hover:bg-[#06b6d4]/80' : ''}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button
                variant={sendType === 'whatsapp' ? 'default' : 'outline'}
                onClick={() => setSendType('whatsapp')}
                className={sendType === 'whatsapp' ? 'bg-[#22c55e] hover:bg-[#22c55e]/80' : ''}
              >
                <Phone className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            </div>

            {/* Selezione tipo entità: Imprese o Comuni */}
            <div className="flex gap-2">
              <Button
                variant={searchEntityType === 'imprese' ? 'default' : 'outline'}
                onClick={() => handleEntityTypeChange('imprese')}
                className={searchEntityType === 'imprese' ? 'bg-[#14b8a6] hover:bg-[#14b8a6]/80' : ''}
                size="sm"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Cerca Impresa
              </Button>
              <Button
                variant={searchEntityType === 'comuni' ? 'default' : 'outline'}
                onClick={() => handleEntityTypeChange('comuni')}
                className={searchEntityType === 'comuni' ? 'bg-[#8b5cf6] hover:bg-[#8b5cf6]/80' : ''}
                size="sm"
              >
                <Landmark className="h-4 w-4 mr-2" />
                Cerca Comune/Settore
              </Button>
            </div>

            {/* Ricerca */}
            <div ref={dropdownRef} className="relative">
              <label className="text-[#e8fbff]/70 text-sm mb-1 block flex items-center gap-2">
                {searchEntityType === 'imprese' ? (
                  <><Building2 className="h-4 w-4" /> Cerca Impresa</>
                ) : (
                  <><Landmark className="h-4 w-4" /> Cerca Settore Comunale</>
                )}
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#e8fbff]/50" />
                <Input
                  placeholder={searchEntityType === 'imprese' 
                    ? "Cerca per nome, CF o email..." 
                    : "Cerca per comune, settore o responsabile..."
                  }
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                    if (!e.target.value) {
                      setSelectedImpresa(null);
                      setSelectedSettore(null);
                    }
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="bg-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff] pl-10 pr-10"
                />
                {(selectedImpresa || selectedSettore) && (
                  <button
                    onClick={handleClearSelection}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#e8fbff]/50 hover:text-[#e8fbff]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Dropdown risultati */}
              {showDropdown && searchQuery && (
                <div className="absolute z-50 w-full mt-1 bg-[#1a2332] border border-[#14b8a6]/30 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {searchEntityType === 'imprese' ? (
                    // Risultati Imprese
                    loadingImprese ? (
                      <div className="p-4 text-center text-[#e8fbff]/50">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </div>
                    ) : filteredImprese.length === 0 ? (
                      <div className="p-4 text-center text-[#e8fbff]/50">
                        Nessuna impresa trovata
                      </div>
                    ) : (
                      filteredImprese.slice(0, 10).map((impresa) => (
                        <div
                          key={impresa.id}
                          onClick={() => handleSelectImpresa(impresa)}
                          className="p-3 hover:bg-[#14b8a6]/20 cursor-pointer border-b border-[#14b8a6]/10 last:border-b-0"
                        >
                          <div className="text-[#e8fbff] font-semibold">{impresa.denominazione}</div>
                          <div className="text-[#e8fbff]/60 text-sm flex items-center gap-4 mt-1">
                            <span>CF: {impresa.codice_fiscale}</span>
                            {impresa.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {impresa.email}
                              </span>
                            )}
                            {impresa.telefono && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {impresa.telefono}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    // Risultati Settori Comunali
                    loadingSettori ? (
                      <div className="p-4 text-center text-[#e8fbff]/50">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      </div>
                    ) : filteredSettori.length === 0 ? (
                      <div className="p-4 text-center text-[#e8fbff]/50">
                        Nessun settore comunale trovato
                      </div>
                    ) : (
                      filteredSettori.slice(0, 10).map((settore) => (
                        <div
                          key={settore.id}
                          onClick={() => handleSelectSettore(settore)}
                          className="p-3 hover:bg-[#8b5cf6]/20 cursor-pointer border-b border-[#8b5cf6]/10 last:border-b-0"
                        >
                          <div className="flex items-center gap-2">
                            <Landmark className="h-4 w-4 text-[#8b5cf6]" />
                            <span className="text-[#e8fbff] font-semibold">{settore.comune_nome}</span>
                            <span className="text-[#8b5cf6]">-</span>
                            <span className="text-[#8b5cf6]">{TIPI_SETTORE_LABELS[settore.tipo_settore] || settore.tipo_settore}</span>
                          </div>
                          <div className="text-[#e8fbff]/60 text-sm flex flex-wrap items-center gap-4 mt-1 ml-6">
                            {settore.responsabile_nome && (
                              <span>Resp: {settore.responsabile_nome} {settore.responsabile_cognome}</span>
                            )}
                            {settore.pec && (
                              <span className="flex items-center gap-1 text-[#f59e0b]">
                                <Mail className="h-3 w-3" /> PEC: {settore.pec}
                              </span>
                            )}
                            {settore.email && !settore.pec && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {settore.email}
                              </span>
                            )}
                            {settore.telefono && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {settore.telefono}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )
                  )}
                </div>
              )}
            </div>

            {/* Impresa selezionata */}
            {selectedImpresa && (
              <div className="p-3 bg-[#14b8a6]/10 border border-[#14b8a6]/30 rounded-lg">
                <div className="flex items-center gap-2 text-[#14b8a6]">
                  <Building2 className="h-4 w-4" />
                  <span className="font-semibold">{selectedImpresa.denominazione}</span>
                </div>
                <div className="text-[#e8fbff]/70 text-sm mt-1 flex items-center gap-4">
                  {selectedImpresa.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {selectedImpresa.email}
                    </span>
                  )}
                  {selectedImpresa.telefono && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {selectedImpresa.telefono}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Settore comunale selezionato */}
            {selectedSettore && (
              <div className="p-3 bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 rounded-lg">
                <div className="flex items-center gap-2 text-[#8b5cf6]">
                  <Landmark className="h-4 w-4" />
                  <span className="font-semibold">{selectedSettore.comune_nome}</span>
                  <span>-</span>
                  <span>{TIPI_SETTORE_LABELS[selectedSettore.tipo_settore] || selectedSettore.tipo_settore}</span>
                </div>
                <div className="text-[#e8fbff]/70 text-sm mt-1 flex flex-wrap items-center gap-4">
                  {selectedSettore.responsabile_nome && (
                    <span>Responsabile: {selectedSettore.responsabile_nome} {selectedSettore.responsabile_cognome}</span>
                  )}
                  {selectedSettore.pec && (
                    <span className="flex items-center gap-1 text-[#f59e0b]">
                      <Mail className="h-3 w-3" /> PEC: {selectedSettore.pec}
                    </span>
                  )}
                  {selectedSettore.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {selectedSettore.email}
                    </span>
                  )}
                  {selectedSettore.telefono && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {selectedSettore.telefono}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Destinatario */}
            <div>
              <label className="text-[#e8fbff]/70 text-sm mb-1 block">
                {sendType === 'email' ? 'Email destinatario' : 'Numero WhatsApp'}
              </label>
              <Input
                placeholder={sendType === 'email' ? 'esempio@email.com' : '+393331234567'}
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                className="bg-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff]"
              />
              {!selectedImpresa && !selectedSettore && (
                <p className="text-[#e8fbff]/40 text-xs mt-1">
                  Puoi cercare un'impresa o un settore comunale sopra, oppure inserire manualmente il destinatario
                </p>
              )}
            </div>

            {/* Oggetto (solo per email) */}
            {sendType === 'email' && (
              <div>
                <label className="text-[#e8fbff]/70 text-sm mb-1 block">Oggetto</label>
                <Input
                  placeholder="Oggetto dell'email"
                  value={sendSubject}
                  onChange={(e) => setSendSubject(e.target.value)}
                  className="bg-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff]"
                />
              </div>
            )}

            {/* Messaggio (solo per email, WhatsApp usa template) */}
            {sendType === 'email' && (
              <div>
                <label className="text-[#e8fbff]/70 text-sm mb-1 block">Messaggio</label>
                <Textarea
                  placeholder="Scrivi il tuo messaggio..."
                  value={sendBody}
                  onChange={(e) => setSendBody(e.target.value)}
                  className="bg-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff] min-h-[120px]"
                />
              </div>
            )}

            {sendType === 'whatsapp' && (
              <div className="p-3 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg text-[#e8fbff]/70 text-sm">
                <strong>Nota:</strong> I messaggi WhatsApp Business utilizzano template pre-approvati da Meta. 
                Verrà inviato un messaggio standard con link alla dashboard DMS Hub.
              </div>
            )}

            {/* Status message */}
            {sendStatus && (
              <div className={`p-3 rounded-lg text-sm ${
                sendStatus.type === 'success' 
                  ? 'bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30' 
                  : 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30'
              }`}>
                {sendStatus.message}
              </div>
            )}

            {/* Pulsante invio */}
            <Button
              onClick={handleSend}
              disabled={sending}
              className="w-full bg-[#10b981] hover:bg-[#10b981]/80"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Invio in corso...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Invia {sendType === 'email' ? 'Email' : 'WhatsApp'}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default NotificationsPanel;
