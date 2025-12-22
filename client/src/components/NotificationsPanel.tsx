import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Bell, Mail, MessageSquare, Send, RefreshCw, 
  ArrowDownLeft, ArrowUpRight, Phone, Loader2, Search, Building2, X
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://orchestratore.mio-hub.me';
const API_BASE_URL = 'http://157.90.29.66:3000';

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

  // Ricerca imprese
  const [imprese, setImprese] = useState<Impresa[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedImpresa, setSelectedImpresa] = useState<Impresa | null>(null);
  const [loadingImprese, setLoadingImprese] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carica lista imprese
  useEffect(() => {
    const fetchImprese = async () => {
      setLoadingImprese(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/imprese`);
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

  // Seleziona impresa
  const handleSelectImpresa = (impresa: Impresa) => {
    setSelectedImpresa(impresa);
    setSearchQuery(impresa.denominazione);
    setShowDropdown(false);
    
    // Auto-popola il campo destinatario
    if (sendType === 'email' && impresa.email) {
      setSendTo(impresa.email);
    } else if (sendType === 'whatsapp' && impresa.telefono) {
      setSendTo(impresa.telefono);
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
    }
  }, [sendType, selectedImpresa]);

  // Reset selezione
  const handleClearSelection = () => {
    setSelectedImpresa(null);
    setSearchQuery('');
    setSendTo('');
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/mihub/notifications/all`);
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
      
      const response = await fetch(`${BACKEND_URL}/api/mihub/notifications/send`, {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aggiorna
        </Button>
      </div>

      {/* Content */}
      {activeTab === 'all' ? (
        <Card className="bg-[#1a2332] border-[#ec4899]/30">
          <CardHeader>
            <CardTitle className="text-[#e8fbff]">Notifiche Recenti</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#ec4899]" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8 text-[#e8fbff]/50">
                Nessuna notifica trovata
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {notifications.map((notif) => (
                  <div key={notif.id} className="p-4 bg-[#0b1220] rounded-lg">
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

            {/* Ricerca Impresa */}
            <div ref={dropdownRef} className="relative">
              <label className="text-[#e8fbff]/70 text-sm mb-1 block flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Cerca Impresa
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#e8fbff]/50" />
                <Input
                  placeholder="Cerca per nome, CF o email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                    if (!e.target.value) setSelectedImpresa(null);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  className="bg-[#0b1220] border-[#14b8a6]/30 text-[#e8fbff] pl-10 pr-10"
                />
                {selectedImpresa && (
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
                  {loadingImprese ? (
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
              {!selectedImpresa && (
                <p className="text-[#e8fbff]/40 text-xs mt-1">
                  Puoi cercare un'impresa sopra o inserire manualmente il destinatario
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
