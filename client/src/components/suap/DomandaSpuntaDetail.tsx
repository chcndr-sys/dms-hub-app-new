/**
 * DomandaSpuntaDetail.tsx
 * 
 * Componente per visualizzare il dettaglio di una domanda spunta.
 * Design identico a quello delle Concessioni.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileCheck, FileText, User, MapPin, Wallet, Calendar, ClipboardCheck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { MIHUB_API_BASE_URL } from '@/config/api';
import { authenticatedFetch } from '@/hooks/useImpersonation';
import { formatDate } from '@/lib/formatUtils';

const API_URL = MIHUB_API_BASE_URL;

interface DomandaSpuntaDetailProps {
  domandaId: number;
  onBack: () => void;
  isAssociazione?: boolean;
}

export default function DomandaSpuntaDetail({ domandaId, onBack, isAssociazione = false }: DomandaSpuntaDetailProps) {
  const [domanda, setDomanda] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const handleApprova = async () => {
    if (!confirm('Sei sicuro di voler approvare questa domanda? Verrà creato il wallet spunta.')) return;
    setActionLoading(true);
    try {
      const res = await authenticatedFetch(`${API_URL}/api/domande-spunta/${domandaId}/approva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Domanda approvata con successo!');
        setDomanda(json.data);
      } else {
        toast.error(json.error || 'Errore nell\'approvazione');
      }
    } catch (err) {
      console.error('Errore:', err);
      toast.error('Errore nell\'approvazione della domanda');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevisione = async () => {
    const motivo = prompt('Inserisci il motivo della richiesta di regolarizzazione:');
    if (!motivo) return;
    setActionLoading(true);
    try {
      const res = await authenticatedFetch(`${API_URL}/api/domande-spunta/${domandaId}/revisione`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo })
      });
      const json = await res.json();
      if (json.success) {
        toast.warning('Richiesta di regolarizzazione inviata');
        setDomanda(json.data);
      } else {
        toast.error(json.error || 'Errore nella richiesta');
      }
    } catch (err) {
      console.error('Errore:', err);
      toast.error('Errore nella richiesta di regolarizzazione');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRifiuta = async () => {
    const motivo = prompt('Inserisci il motivo del rifiuto:');
    if (!motivo) return;
    if (!confirm('Sei sicuro di voler rifiutare questa domanda?')) return;
    setActionLoading(true);
    try {
      const res = await authenticatedFetch(`${API_URL}/api/domande-spunta/${domandaId}/rifiuta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo })
      });
      const json = await res.json();
      if (json.success) {
        toast.error('Domanda rifiutata');
        setDomanda(json.data);
      } else {
        toast.error(json.error || 'Errore nel rifiuto');
      }
    } catch (err) {
      console.error('Errore:', err);
      toast.error('Errore nel rifiuto della domanda');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    const fetchDomanda = async () => {
      try {
        const res = await fetch(`${API_URL}/api/domande-spunta/${domandaId}`);
        const json = await res.json();
        if (json.success && json.data) {
          setDomanda(json.data);
        } else {
          toast.error('Errore nel caricamento della domanda');
        }
      } catch (err) {
        console.error('Errore:', err);
        toast.error('Errore nel caricamento della domanda');
      } finally {
        setLoading(false);
      }
    };
    fetchDomanda();
  }, [domandaId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#14b8a6]"></div>
      </div>
    );
  }

  if (!domanda) {
    return (
      <div className="text-center text-gray-400 py-8">
        Domanda non trovata
      </div>
    );
  }

  const handleExport = () => {
    const content = `
DOMANDA SPUNTA N. ${domanda.numero_autorizzazione || domanda.id}
${'='.repeat(50)}

DATI DOMANDA
------------
Numero: ${domanda.numero_autorizzazione || `#${domanda.id}`}
Data Richiesta: ${formatDate(domanda.data_richiesta)}
Stato: ${domanda.stato || '-'}
Settore Richiesto: ${domanda.settore_richiesto || '-'}
Giorno: ${domanda.giorno_settimana || domanda.market_days || '-'}
Presenze Accumulate: ${domanda.numero_presenze || 0}

IMPRESA RICHIEDENTE
-------------------
Ragione Sociale: ${domanda.company_name || '-'}
Partita IVA: ${domanda.company_piva || '-'}
Codice Fiscale: ${domanda.company_cf || '-'}
Nome Rappresentante: ${domanda.rappresentante_legale_nome || '-'}
Cognome Rappresentante: ${domanda.rappresentante_legale_cognome || '-'}

MERCATO DI RIFERIMENTO
----------------------
Mercato: ${domanda.market_name || '-'}
Comune: ${domanda.market_municipality || '-'}
Giorno: ${domanda.market_days || '-'}

AUTORIZZAZIONE DI RIFERIMENTO
-----------------------------
Numero Autorizzazione: ${domanda.numero_autorizzazione || '-'}
Tipo: ${domanda.autorizzazione_tipo === 'A' ? 'Tipo A - Posteggio' : domanda.autorizzazione_tipo === 'B' ? 'Tipo B - Itinerante' : '-'}
Ente Rilascio: ${domanda.autorizzazione_ente || '-'}
Data Rilascio: ${formatDate(domanda.autorizzazione_data)}

WALLET SPUNTA
-------------
ID Wallet: ${domanda.wallet_id || '-'}
Saldo: € ${parseFloat(domanda.wallet_balance || 0).toFixed(2)}

NOTE
----
${domanda.note || 'Nessuna'}

${'='.repeat(50)}
Documento generato il ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}
    `.trim();
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DomandaSpunta_${domanda.id}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Domanda esportata!', {
      description: `File scaricato: DomandaSpunta_${domanda.id}.txt`
    });
  };

  const getStatoBadgeClass = () => {
    switch (domanda.stato?.toUpperCase()) {
      case 'APPROVATA':
        return 'bg-green-500/20 text-green-400';
      case 'IN_ATTESA':
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'RIFIUTATA':
        return 'bg-red-500/20 text-red-400';
      case 'SOSPESA':
        return 'bg-orange-500/20 text-orange-400';
      default:
        return 'bg-blue-500/20 text-blue-400';
    }
  };

  const getStatoDotClass = () => {
    switch (domanda.stato?.toUpperCase()) {
      case 'APPROVATA':
        return 'bg-green-500';
      case 'IN_ATTESA':
      case 'PENDING':
        return 'bg-yellow-500';
      case 'RIFIUTATA':
        return 'bg-red-500';
      case 'SOSPESA':
        return 'bg-orange-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con pulsante torna */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla lista
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatoDotClass()}`} />
            <span className="text-sm text-gray-400">
              {domanda.stato || 'N/D'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Titolo domanda */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#e8fbff] flex items-center gap-3">
            Domanda Spunta #{domanda.id}
            <Badge className={getStatoBadgeClass()}>
              {domanda.stato || 'N/D'}
            </Badge>
          </h3>
          <p className="text-gray-400">
            {domanda.market_name || 'N/A'} - {domanda.company_name || 'N/A'} ({domanda.company_piva || 'N/A'})
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Pulsanti azione per il funzionario SUAP - nascosti in modalità associazione */}
          {!isAssociazione && domanda.stato !== 'APPROVATA' && domanda.stato !== 'RIFIUTATA' && (
            <>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleApprova}
                disabled={actionLoading}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approva
              </Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={handleRevisione}
                disabled={actionLoading}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Richiedi Regolarizzazione
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleRifiuta}
                disabled={actionLoading}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Rifiuta
              </Button>
            </>
          )}
          <Button
            variant="outline"
            className="border-[#14b8a6]/30 text-[#e8fbff]"
            onClick={handleExport}
          >
            <FileCheck className="mr-2 h-4 w-4" />
            Esporta
          </Button>
        </div>
      </div>
      
      {/* Sezione Dati Domanda */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#14b8a6] flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5" />
            Dati Domanda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">N. Domanda</p>
              <p className="text-[#e8fbff] font-medium">#{domanda.id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Data Richiesta</p>
              <p className="text-[#e8fbff] font-medium">{formatDate(domanda.data_richiesta)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Settore Richiesto</p>
              <p className="text-[#e8fbff] font-medium">{domanda.settore_richiesto || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Giorno</p>
              <p className="text-[#e8fbff] font-medium">{domanda.giorno_settimana || domanda.market_days || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Presenze</p>
              <p className="text-[#e8fbff] font-medium">{domanda.numero_presenze || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Data Prima Presenza</p>
              <p className="text-[#e8fbff] font-medium">{formatDate(domanda.data_prima_presenza)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Note</p>
              <p className="text-[#e8fbff] font-medium">{domanda.note || 'Nessuna'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Sezione Impresa Richiedente */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#14b8a6] flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Impresa Richiedente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Ragione Sociale</p>
              <p className="text-[#e8fbff] font-medium">{domanda.company_name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Partita IVA</p>
              <p className="text-[#e8fbff] font-medium">{domanda.company_piva || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Codice Fiscale</p>
              <p className="text-[#e8fbff] font-medium">{domanda.company_cf || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Nome</p>
              <p className="text-[#e8fbff] font-medium">{domanda.rappresentante_legale_nome || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Cognome</p>
              <p className="text-[#e8fbff] font-medium">{domanda.rappresentante_legale_cognome || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Sezione Mercato */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#14b8a6] flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Mercato di Riferimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Mercato</p>
              <p className="text-[#e8fbff] font-medium">{domanda.market_name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Comune</p>
              <p className="text-[#e8fbff] font-medium">{domanda.market_municipality || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Giorno Mercato</p>
              <p className="text-[#e8fbff] font-medium">{domanda.market_days || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Sezione Autorizzazione di Riferimento */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#14b8a6] flex items-center gap-2 text-lg">
            <ClipboardCheck className="h-5 w-5" />
            Autorizzazione di Riferimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">N. Autorizzazione</p>
              <p className="text-[#e8fbff] font-medium">{domanda.numero_autorizzazione || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Tipo</p>
              <p className="text-[#e8fbff] font-medium">
                {domanda.autorizzazione_tipo === 'A' ? 'Tipo A - Posteggio' : 
                 domanda.autorizzazione_tipo === 'B' ? 'Tipo B - Itinerante' : '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Ente Rilascio</p>
              <p className="text-[#e8fbff] font-medium">{domanda.autorizzazione_ente || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Data Rilascio</p>
              <p className="text-[#e8fbff] font-medium">{formatDate(domanda.autorizzazione_data)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Sezione Wallet Spunta */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0b1220] border-[#14b8a6]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#14b8a6] flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5" />
            Wallet Spunta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">ID Wallet</p>
              <p className="text-[#e8fbff] font-medium">{domanda.wallet_id || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Saldo</p>
              <p className="text-[#e8fbff] font-medium text-lg">
                <span className={parseFloat(domanda.wallet_balance || 0) > 0 ? 'text-green-400' : 'text-orange-400'}>
                  € {parseFloat(domanda.wallet_balance || 0).toFixed(2)}
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Stato Wallet</p>
              <p className="text-[#e8fbff] font-medium">
                {domanda.wallet_id ? (
                  <span className="text-green-400">✓ Attivo</span>
                ) : (
                  <span className="text-red-400">✗ Non creato</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
