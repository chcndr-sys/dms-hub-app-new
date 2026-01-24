/**
 * Wallet Impresa - Pagamenti PagoPA
 * Pagina dedicata per visualizzare il wallet dell'impresa loggata
 * v3.71.0 - Fix scadenze e pulsante pagamento
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  Wallet, Euro, Calendar, Clock, CreditCard, CheckCircle, 
  AlertCircle, ArrowLeft, RefreshCw, FileText, Building2,
  Receipt, TrendingUp, ChevronRight, ChevronDown, ChevronUp,
  Store, MapPin, AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Tipi wallet
interface WalletItem {
  id: number;
  type: 'SPUNTA' | 'CONCESSIONE' | 'GENERICO';
  balance: number;
  status: 'ACTIVE' | 'BLOCKED' | 'LOW_BALANCE';
  market_name?: string;
  concession_code?: string;
  stall_number?: string;
  stall_area?: number;
  cost_per_sqm?: number;
  annual_market_days?: number;
  updated_at: string;
}

interface CompanyWallets {
  company_id: number;
  ragione_sociale: string;
  partita_iva: string;
  spunta_wallets: WalletItem[];
  concession_wallets: WalletItem[];
}

// Tipo scadenza dal backend
interface ScadenzaAPI {
  id: number;
  wallet_id: number;
  anno_riferimento: number;
  importo_dovuto: string;
  importo_pagato: string;
  data_scadenza: string;
  data_pagamento: string | null;
  stato: string;
  giorni_ritardo: number;
  importo_mora: string;
  importo_interessi: string;
  rata_numero: number;
  rata_totale: number;
  pagato_in_mora: boolean;
  tipo: string;
  note: string | null;
  wallet_tipo: string;
  wallet_saldo: string;
  ragione_sociale: string;
  partita_iva: string;
  mercato_nome: string;
  posteggio: string;
  concessione_status: string;
  concessione_id: number;
  giorni_ritardo_calc: number;
  giorni_grazia: number;
  stato_dinamico: string;
}

export default function WalletImpresaPage() {
  const [, setLocation] = useLocation();
  const [company, setCompany] = useState<CompanyWallets | null>(null);
  const [scadenze, setScadenze] = useState<ScadenzaAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wallet');
  const [expandedSpunta, setExpandedSpunta] = useState(false);
  const [expandedConcessioni, setExpandedConcessioni] = useState(true);
  const [selectedScadenza, setSelectedScadenza] = useState<ScadenzaAPI | null>(null);
  const [showPagamentoDialog, setShowPagamentoDialog] = useState(false);
  
  // ID impresa dall'utente loggato
  const getImpresaId = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.impresa_id || null;
    }
    return null;
  };
  
  const IMPRESA_ID = getImpresaId();
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';

  // Carica dati wallet impresa
  const fetchData = async () => {
    if (!IMPRESA_ID) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // Fetch wallet impresa
      const walletsRes = await fetch(`${API_BASE_URL}/api/wallets/company/${IMPRESA_ID}`);
      const walletsData = await walletsRes.json();
      
      let spuntaWallets: WalletItem[] = [];
      let concessionWallets: WalletItem[] = [];
      
      if (walletsData.success && walletsData.data) {
        const wallets = walletsData.data;
        // v3.73.0: Aggiunto supporto per tipo SPUNTISTA (mostrato come GENERICO)
        spuntaWallets = wallets.filter((w: any) => w.type === 'SPUNTA' || w.type === 'GENERICO' || w.type === 'SPUNTISTA').map((w: any) => ({
          id: w.id,
          type: (w.type === 'GENERICO' || w.type === 'SPUNTISTA' ? 'GENERICO' : 'SPUNTA') as 'SPUNTA' | 'GENERICO',
          balance: parseFloat(w.balance) || 0,
          status: w.status,
          market_name: w.market_name,
          stall_number: w.stall_number,
          updated_at: w.last_update
        }));
        concessionWallets = wallets.filter((w: any) => w.type === 'CONCESSION').map((w: any) => ({
          id: w.id,
          type: 'CONCESSIONE' as const,
          balance: parseFloat(w.balance) || 0,
          status: w.status,
          market_name: w.market_name,
          concession_code: w.concession_code,
          stall_number: w.stall_number,
          stall_area: parseFloat(w.stall_area) || 0,
          updated_at: w.last_update
        }));
      }
      
      // Fetch dati impresa
      const impresaRes = await fetch(`${API_BASE_URL}/api/imprese/${IMPRESA_ID}`);
      const impresaData = await impresaRes.json();
      
      setCompany({
        company_id: IMPRESA_ID,
        ragione_sociale: impresaData.success ? impresaData.data?.denominazione : 'Impresa',
        partita_iva: impresaData.success ? impresaData.data?.partita_iva : 'N/A',
        spunta_wallets: spuntaWallets,
        concession_wallets: concessionWallets
      });
      
      // Fetch scadenze usando l'endpoint riepilogo con filtro per ragione sociale
      const ragioneSociale = impresaData.success ? impresaData.data?.denominazione : '';
      if (ragioneSociale) {
        const scadenzeRes = await fetch(`${API_BASE_URL}/api/canone-unico/riepilogo?impresa_search=${encodeURIComponent(ragioneSociale)}`);
        const scadenzeData = await scadenzeRes.json();
        if (scadenzeData.success) {
          setScadenze(scadenzeData.data || []);
        }
      }
    } catch (error) {
      console.error('Errore caricamento dati wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calcola totali
  const totaleSaldo = company ? 
    [...(company.spunta_wallets || []), ...(company.concession_wallets || [])]
      .reduce((sum, w) => sum + (w.balance || 0), 0) : 0;
  
  const scadenzeNonPagate = scadenze.filter(s => s.stato !== 'PAGATO');
  const totaleDaPagare = scadenzeNonPagate.reduce((sum, s) => {
    const importo = parseFloat(s.importo_dovuto) || 0;
    const mora = parseFloat(s.importo_mora) || 0;
    const interessi = parseFloat(s.importo_interessi) || 0;
    return sum + importo + mora + interessi;
  }, 0);

  // Gestisce pagamento simulato
  const handlePaga = async (scadenza: ScadenzaAPI) => {
    setSelectedScadenza(scadenza);
    setShowPagamentoDialog(true);
  };

  const handleConfirmaPagamento = async () => {
    if (!selectedScadenza) return;
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';
      const importoTotale = parseFloat(selectedScadenza.importo_dovuto) + parseFloat(selectedScadenza.importo_mora || '0') + parseFloat(selectedScadenza.importo_interessi || '0');
      const description = `Pagamento Canone ${selectedScadenza.tipo === 'CANONE_ANNUO' ? 'Annuo' : selectedScadenza.tipo} - Rata ${selectedScadenza.rata_numero}/${selectedScadenza.rata_totale} - ${selectedScadenza.mercato_nome} - Posteggio ${selectedScadenza.posteggio}`;
      
      // Usa l'endpoint corretto /api/wallets/deposit
      const response = await fetch(`${API_URL}/api/wallets/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_id: selectedScadenza.wallet_id,
          amount: importoTotale,
          description: description,
          scadenza_id: selectedScadenza.id
        })
      });
      const data = await response.json();
      if (data.success) {
        alert('Pagamento simulato completato!');
        setShowPagamentoDialog(false);
        fetchData();
      } else {
        alert('Errore: ' + (data.error || 'Errore sconosciuto'));
      }
    } catch (err) {
      console.error('Errore pagamento:', err);
      alert('Errore di connessione');
    }
  };

  // Colore stato wallet
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/20 text-green-400';
      case 'BLOCKED': return 'bg-red-500/20 text-red-400';
      case 'LOW_BALANCE': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Colore stato scadenza
  const getStatoColor = (stato: string) => {
    switch (stato) {
      case 'PAGATO': return 'bg-green-500/20 text-green-400';
      case 'NON_PAGATO': return 'bg-yellow-500/20 text-yellow-400';
      case 'IN_MORA': return 'bg-red-500/20 text-red-400';
      case 'SCADUTO': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  // Se non c'è impresa_id, mostra messaggio
  if (!IMPRESA_ID) {
    return (
      <div className="min-h-screen bg-[#0b1220] text-[#e8fbff] flex items-center justify-center">
        <Card className="bg-[#1a2332] border-[#14b8a6]/20 max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h2 className="text-xl font-bold mb-2">Accesso non autorizzato</h2>
            <p className="text-[#e8fbff]/70 mb-4">
              Per visualizzare il wallet devi effettuare il login con un account impresa.
            </p>
            <Button onClick={() => setLocation('/')} className="bg-[#14b8a6] hover:bg-[#14b8a6]/80">
              Torna alla Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-[#e8fbff]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1a2332] to-[#0b1220] border-b border-[#14b8a6]/20 p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setLocation('/')}
            className="text-[#e8fbff]/70 hover:text-[#e8fbff]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Torna alla Home
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#14b8a6] to-[#3b82f6] flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#e8fbff]">Wallet Impresa</h1>
              <p className="text-sm text-[#e8fbff]/50">{company?.ragione_sociale || 'Caricamento...'}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchData}
            className="border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/10"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Aggiorna
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-[#1a2332] border-[#14b8a6]/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#e8fbff]/50">Saldo Totale</p>
                  <p className={`text-2xl font-bold ${totaleSaldo >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                    €{totaleSaldo.toFixed(2)}
                  </p>
                </div>
                <Euro className="w-8 h-8 text-[#14b8a6]/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1a2332] border-[#14b8a6]/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#e8fbff]/50">Wallet Spunta</p>
                  <p className="text-2xl font-bold text-[#14b8a6]">{company?.spunta_wallets?.length || 0}</p>
                </div>
                <Wallet className="w-8 h-8 text-[#14b8a6]/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1a2332] border-[#14b8a6]/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#e8fbff]/50">Concessioni</p>
                  <p className="text-2xl font-bold text-[#3b82f6]">{company?.concession_wallets?.length || 0}</p>
                </div>
                <Store className="w-8 h-8 text-[#3b82f6]/50" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-[#1a2332] border-[#14b8a6]/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#e8fbff]/50">Da Pagare</p>
                  <p className={`text-2xl font-bold ${totaleDaPagare > 0 ? 'text-[#f59e0b]' : 'text-[#10b981]'}`}>
                    €{totaleDaPagare.toFixed(2)}
                  </p>
                </div>
                <Receipt className="w-8 h-8 text-[#f59e0b]/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#1a2332] border border-[#14b8a6]/20">
            <TabsTrigger value="wallet" className="data-[state=active]:bg-[#14b8a6]/20">
              <Wallet className="w-4 h-4 mr-2" />
              Wallet
            </TabsTrigger>
            <TabsTrigger value="scadenze" className="data-[state=active]:bg-[#14b8a6]/20">
              <Receipt className="w-4 h-4 mr-2" />
              Scadenze ({scadenzeNonPagate.length})
            </TabsTrigger>
            <TabsTrigger value="storico" className="data-[state=active]:bg-[#14b8a6]/20">
              <FileText className="w-4 h-4 mr-2" />
              Storico
            </TabsTrigger>
          </TabsList>

          {/* Tab Wallet */}
          <TabsContent value="wallet">
            <Card className="bg-[#1a2332] border-[#14b8a6]/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-[#14b8a6]" />
                      {company?.ragione_sociale || 'Impresa'}
                    </CardTitle>
                    <CardDescription className="text-[#e8fbff]/50">
                      P.IVA: {company?.partita_iva || 'N/A'}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-[#14b8a6]/20 text-[#14b8a6] mb-1">
                      WALLET: {(company?.spunta_wallets?.length || 0) + (company?.concession_wallets?.length || 0)}
                    </Badge>
                    <p className={`text-lg font-bold ${totaleSaldo >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                      TOTALE: €{totaleSaldo.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-[#e8fbff]/50">
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
                    Caricamento...
                  </div>
                ) : (
                  <>
                    {/* Portafogli Spunta */}
                    <Collapsible open={expandedSpunta} onOpenChange={setExpandedSpunta}>
                      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-[#0b1220] rounded-lg border border-[#14b8a6]/20 hover:border-[#14b8a6]/40 transition-colors">
                        <div className="flex items-center gap-2 text-[#14b8a6]">
                          <Wallet className="w-4 h-4" />
                          <span className="font-medium">Portafogli Spunta ({company?.spunta_wallets?.length || 0})</span>
                        </div>
                        {expandedSpunta ? <ChevronUp className="w-4 h-4 text-[#e8fbff]/50" /> : <ChevronDown className="w-4 h-4 text-[#e8fbff]/50" />}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-2">
                        {company?.spunta_wallets?.map((wallet) => (
                          <div key={wallet.id} className="p-3 bg-[#0b1220]/50 rounded-lg border border-[#14b8a6]/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {wallet.type === 'GENERICO' ? (
                                  <Badge className="bg-slate-600 text-white">GENERICO</Badge>
                                ) : (
                                  <Badge className="bg-[#14b8a6]/20 text-[#14b8a6]">{wallet.market_name}</Badge>
                                )}
                                <div>
                                  <p className="font-medium text-[#e8fbff]">
                                    {wallet.type === 'GENERICO' ? 'Credito Spunta' : wallet.market_name}
                                  </p>
                                  <p className="text-sm text-[#e8fbff]/50">ID Wallet: #{wallet.id}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className={getStatusColor(wallet.status)}>{wallet.status}</Badge>
                                <p className={`text-lg font-bold ${wallet.balance >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                                  €{wallet.balance.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!company?.spunta_wallets || company.spunta_wallets.length === 0) && (
                          <p className="text-center py-4 text-[#e8fbff]/50">Nessun portafoglio spunta</p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Concessioni Attive */}
                    <Collapsible open={expandedConcessioni} onOpenChange={setExpandedConcessioni}>
                      <CollapsibleTrigger className="w-full flex items-center justify-between p-3 bg-[#0b1220] rounded-lg border border-[#3b82f6]/20 hover:border-[#3b82f6]/40 transition-colors">
                        <div className="flex items-center gap-2 text-[#3b82f6]">
                          <Store className="w-4 h-4" />
                          <span className="font-medium">Concessioni Attive ({company?.concession_wallets?.length || 0})</span>
                        </div>
                        {expandedConcessioni ? <ChevronUp className="w-4 h-4 text-[#e8fbff]/50" /> : <ChevronDown className="w-4 h-4 text-[#e8fbff]/50" />}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2 space-y-2">
                        {company?.concession_wallets?.map((wallet) => (
                          <div key={wallet.id} className="p-3 bg-[#0b1220]/50 rounded-lg border border-[#3b82f6]/10">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Store className="w-4 h-4 text-[#3b82f6]" />
                                <div>
                                  <p className="font-medium text-[#e8fbff]">{wallet.market_name}</p>
                                  <p className="text-sm text-[#e8fbff]/50">
                                    Concessione: #{wallet.concession_code} • {wallet.stall_area} mq
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge className={getStatusColor(wallet.status)}>{wallet.status}</Badge>
                                <p className={`text-lg font-bold ${wallet.balance >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                                  €{wallet.balance.toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!company?.concession_wallets || company.concession_wallets.length === 0) && (
                          <p className="text-center py-4 text-[#e8fbff]/50">Nessuna concessione attiva</p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Scadenze */}
          <TabsContent value="scadenze">
            <Card className="bg-[#1a2332] border-[#14b8a6]/20">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#14b8a6]" />
                  Scadenze da Pagare
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scadenzeNonPagate.length === 0 ? (
                  <div className="text-center py-8 text-[#e8fbff]/50">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                    <p>Nessuna scadenza da pagare</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scadenzeNonPagate.map((scadenza) => {
                      const importo = parseFloat(scadenza.importo_dovuto) || 0;
                      const mora = parseFloat(scadenza.importo_mora) || 0;
                      const interessi = parseFloat(scadenza.importo_interessi) || 0;
                      const totale = importo + mora + interessi;
                      const inMora = scadenza.stato === 'IN_MORA' || scadenza.stato_dinamico === 'IN_MORA';
                      
                      return (
                        <div 
                          key={scadenza.id} 
                          className={`p-4 bg-[#0b1220] rounded-lg border ${inMora ? 'border-red-500/30' : 'border-[#14b8a6]/10'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {inMora ? (
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                              ) : (
                                <Receipt className="w-5 h-5 text-[#14b8a6]" />
                              )}
                              <div>
                                <h4 className="font-medium text-[#e8fbff]">
                                  {scadenza.tipo === 'CANONE_ANNUO' ? 'Canone Annuo' : scadenza.tipo} - Rata {scadenza.rata_numero}/{scadenza.rata_totale}
                                </h4>
                                <p className="text-sm text-[#e8fbff]/50">
                                  {scadenza.mercato_nome} • Posteggio {scadenza.posteggio}
                                </p>
                                <p className="text-sm text-[#e8fbff]/50">
                                  Scadenza: {new Date(scadenza.data_scadenza).toLocaleDateString('it-IT')}
                                  {inMora && (
                                    <span className="text-red-400 ml-2">
                                      ({scadenza.giorni_ritardo_calc || scadenza.giorni_ritardo} gg MORA)
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <Badge className={getStatoColor(scadenza.stato_dinamico || scadenza.stato)}>
                                  {(scadenza.stato_dinamico || scadenza.stato).replace('_', ' ')}
                                </Badge>
                                <p className="text-lg font-bold text-[#e8fbff]">€{importo.toFixed(2)}</p>
                                {mora > 0 && (
                                  <p className="text-sm text-red-400">+€{(mora + interessi).toFixed(2)} mora</p>
                                )}
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => handlePaga(scadenza)} 
                                className={`${inMora ? 'bg-red-600 hover:bg-red-700' : 'bg-[#14b8a6] hover:bg-[#14b8a6]/80'}`}
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Paga €{totale.toFixed(2)}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Storico */}
          <TabsContent value="storico">
            <Card className="bg-[#1a2332] border-[#14b8a6]/20">
              <CardHeader>
                <CardTitle className="text-[#e8fbff] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#14b8a6]" />
                  Storico Pagamenti
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scadenze.filter(s => s.stato === 'PAGATO').length === 0 ? (
                  <div className="text-center py-8 text-[#e8fbff]/50">
                    <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nessun pagamento effettuato</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scadenze
                      .filter(s => s.stato === 'PAGATO')
                      .map((scadenza) => (
                        <div key={scadenza.id} className="flex items-center justify-between p-4 bg-[#0b1220] rounded-lg border border-green-500/20">
                          <div className="flex items-center gap-4">
                            <CheckCircle className="w-5 h-5 text-green-400" />
                            <div>
                              <h4 className="font-medium text-[#e8fbff]">
                                {scadenza.tipo === 'CANONE_ANNUO' ? 'Canone Annuo' : scadenza.tipo} - Rata {scadenza.rata_numero}/{scadenza.rata_totale}
                              </h4>
                              <p className="text-sm text-[#e8fbff]/50">
                                Pagato il: {scadenza.data_pagamento ? new Date(scadenza.data_pagamento).toLocaleDateString('it-IT') : 'N/A'}
                                {scadenza.pagato_in_mora && <span className="text-yellow-400 ml-2">(pagato in mora)</span>}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <Badge className="bg-green-500/20 text-green-400">PAGATO</Badge>
                            <span className="text-xl font-bold text-green-400">€{parseFloat(scadenza.importo_pagato || scadenza.importo_dovuto).toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog Pagamento */}
      <Dialog open={showPagamentoDialog} onOpenChange={setShowPagamentoDialog}>
        <DialogContent className="bg-[#1a2332] border-[#14b8a6]/20 text-[#e8fbff]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#14b8a6]" />
              Pagamento Canone
            </DialogTitle>
            <DialogDescription className="text-[#e8fbff]/70">
              {selectedScadenza?.mercato_nome} - Posteggio {selectedScadenza?.posteggio}
            </DialogDescription>
          </DialogHeader>
          
          {selectedScadenza && (
            <div className="space-y-4">
              <div className="bg-[#0b1220] p-4 rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="text-[#e8fbff]/70">Rata {selectedScadenza.rata_numero}/{selectedScadenza.rata_totale}</span>
                  <span className="text-[#e8fbff]">€{parseFloat(selectedScadenza.importo_dovuto).toFixed(2)}</span>
                </div>
                {parseFloat(selectedScadenza.importo_mora) > 0 && (
                  <div className="flex justify-between mb-2 text-red-400">
                    <span>Mora ({selectedScadenza.giorni_ritardo_calc} gg)</span>
                    <span>+€{parseFloat(selectedScadenza.importo_mora).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(selectedScadenza.importo_interessi) > 0 && (
                  <div className="flex justify-between mb-2 text-red-400">
                    <span>Interessi</span>
                    <span>+€{parseFloat(selectedScadenza.importo_interessi).toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-[#14b8a6]/20 pt-2 mt-2 flex justify-between font-bold text-lg">
                  <span>TOTALE</span>
                  <span className="text-[#14b8a6]">
                    €{(parseFloat(selectedScadenza.importo_dovuto) + parseFloat(selectedScadenza.importo_mora || '0') + parseFloat(selectedScadenza.importo_interessi || '0')).toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setShowPagamentoDialog(false)} className="border-[#14b8a6]/30">
                  Annulla
                </Button>
                <Button onClick={handleConfirmaPagamento} className="bg-[#14b8a6] hover:bg-[#14b8a6]/80">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Paga Ora (Simulazione)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
