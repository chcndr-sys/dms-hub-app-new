/**
 * NuovoVerbalePage - Form Professionale per Verbali PM
 * Versione: 2.0.0
 * Data: 26 Gennaio 2026
 * 
 * Form a pagina intera per la creazione di verbali di contestazione
 * conformi alla L. 689/81 e D.Lgs. 114/98
 */

import { useState, useEffect } from 'react';
import { useImpersonation, getImpersonationParams, authenticatedFetch } from '@/hooks/useImpersonation';
import { useLocation } from 'wouter';
import { 
  Shield, FileText, User, Building2, MapPin, Calendar, 
  AlertTriangle, Euro, Save, ArrowLeft, Search, X, 
  CheckCircle, Clock, FileCheck, Scale, Printer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MIHUB_API_BASE_URL } from '@/config/api';

// API Base URL - usa backend Hetzner
const MIHUB_API = MIHUB_API_BASE_URL + '/api';

// Types
interface ConfigData {
  comune: {
    nome: string;
    provincia: string;
    regione: string;
    indirizzo: string;
    cap: string;
    telefono: string;
    pec: string;
  };
  corpo_pm: {
    nome: string;
    comando: string;
    cap: string;
    telefono: string;
    email: string;
  };
  termini_pagamento: {
    ridotto_giorni: number;
    ridotto_percentuale: number;
    ordinario_giorni: number;
  };
}

interface Infrazione {
  id: number;
  code: string;
  description: string;
  category: string;
  min_amount: string;
  max_amount: string;
  default_amount: string;
  testo_legge_completo: string | null;
}

interface Impresa {
  id: number;
  denominazione: string;
  partita_iva: string;
  codice_fiscale: string;
  indirizzo_via: string;
  indirizzo_civico: string;
  indirizzo_cap: string;
  indirizzo_provincia: string;
  comune: string;
  telefono: string;
  email: string;
  pec: string;
  rappresentante_legale_nome: string;
  rappresentante_legale_cognome: string;
  rappresentante_legale_cf: string;
  rappresentante_legale_data_nascita: string;
  rappresentante_legale_luogo_nascita: string;
  rappresentante_legale_residenza_via: string;
  rappresentante_legale_residenza_civico: string;
  rappresentante_legale_residenza_cap: string;
  rappresentante_legale_residenza_comune: string;
  rappresentante_legale_residenza_provincia: string;
  indirizzo?: string;
  citta?: string;
}

export default function NuovoVerbalePage() {
  const [, setLocationPath] = useLocation();
  
  // Hook per impersonificazione - legge comune_id dall'URL o sessionStorage
  const { isImpersonating, comuneId, comuneNome } = useImpersonation();
  const impersonatedComuneId = comuneId ? parseInt(comuneId) : null;
  
  // State
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [infrazioni, setInfrazioni] = useState<Infrazione[]>([]);
  const [imprese, setImprese] = useState<Impresa[]>([]);
  const [comuni, setComuni] = useState<{id: number; nome: string; provincia: string}[]>([]);
  const [selectedComuneId, setSelectedComuneId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [showInfrazioneModal, setShowInfrazioneModal] = useState(false);
  const [showImpresaModal, setShowImpresaModal] = useState(false);
  const [searchInfrazione, setSearchInfrazione] = useState('');
  const [searchImpresa, setSearchImpresa] = useState('');
  
  // Form state - Sezione Agente
  const [agentName, setAgentName] = useState('');
  const [agentBadge, setAgentBadge] = useState('');
  const [agentQualifica, setAgentQualifica] = useState('Agente di Polizia Municipale');
  
  // Form state - Sezione Luogo e Data
  const [location, setLocation] = useState('');
  const [violationDate, setViolationDate] = useState('');
  const [violationTime, setViolationTime] = useState('');
  
  // Form state - Sezione Trasgressore
  const [selectedImpresa, setSelectedImpresa] = useState<Impresa | null>(null);
  const [transgressorName, setTransgressorName] = useState('');
  const [transgressorCF, setTransgressorCF] = useState('');
  const [transgressorBirthDate, setTransgressorBirthDate] = useState('');
  const [transgressorBirthPlace, setTransgressorBirthPlace] = useState('');
  const [transgressorAddress, setTransgressorAddress] = useState('');
  const [transgressorDocType, setTransgressorDocType] = useState('');
  const [transgressorDocNumber, setTransgressorDocNumber] = useState('');
  const [transgressorDocReleasedBy, setTransgressorDocReleasedBy] = useState('');
  
  // Form state - Sezione Proprietario (se diverso)
  const [ownerDifferent, setOwnerDifferent] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [ownerCF, setOwnerCF] = useState('');
  const [ownerAddress, setOwnerAddress] = useState('');
  
  // Form state - Sezione Violazione
  const [selectedInfrazione, setSelectedInfrazione] = useState<Infrazione | null>(null);
  const [violationDescription, setViolationDescription] = useState('');
  
  // Form state - Sezione Dichiarazioni
  const [transgressorDeclaration, setTransgressorDeclaration] = useState('');
  const [contestedImmediately, setContestedImmediately] = useState(true);
  
  // Form state - Sezione Sanzione
  const [amount, setAmount] = useState('');
  const [accessorySanctions, setAccessorySanctions] = useState('');
  
  // Form state - Note
  const [notes, setNotes] = useState('');

  // Fetch data on mount
  useEffect(() => {
    fetchInitialData();
  }, []);

  // Effetto separato per gestire l'impersonificazione dopo il caricamento dei comuni
  useEffect(() => {
    if (isImpersonating && impersonatedComuneId && comuni.length > 0) {
      // Verifica che il comune esista nella lista
      const comuneExists = comuni.some(c => c.id === impersonatedComuneId);
      if (comuneExists) {
        setSelectedComuneId(impersonatedComuneId);
        console.warn('[Verbale] Impersonificazione: selezionato comune', impersonatedComuneId);
      }
    }
  }, [isImpersonating, impersonatedComuneId, comuni]);

  const fetchInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Leggi i parametri di impersonificazione (URL o sessionStorage)
      const impState = getImpersonationParams();
      const urlImpersonate = impState.isImpersonating;
      const urlComuneId = impState.comuneId ? parseInt(impState.comuneId) : null;
      
      console.warn('[Verbale] Impersonation params - impersonate:', urlImpersonate, 'comune_id:', urlComuneId, '(from:', impState.comuneId ? 'storage/url' : 'none', ')');
      
      // Timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      // Fetch comuni
      const comuniRes = await fetch(`${MIHUB_API}/comuni`, { signal: controller.signal });
      const comuniData = await comuniRes.json();
      if (comuniData.success) {
        setComuni(comuniData.data || []);
        // Se in modalità impersonificazione, usa il comune dall'URL
        // Altrimenti seleziona il primo comune di default
        if (urlImpersonate && urlComuneId) {
          // Verifica che il comune esista nella lista
          const comuneExists = comuniData.data?.some((c: any) => c.id === urlComuneId);
          if (comuneExists) {
            setSelectedComuneId(urlComuneId);
            console.warn('[Verbale] Usando comune da impersonificazione:', urlComuneId);
          } else {
            console.warn('[Verbale] Comune impersonificato non trovato:', urlComuneId);
            if (comuniData.data?.length > 0) {
              setSelectedComuneId(comuniData.data[0].id);
            }
          }
        } else if (comuniData.data?.length > 0) {
          setSelectedComuneId(comuniData.data[0].id);
        }
      }

      // Fetch config
      const configRes = await fetch(`${MIHUB_API}/verbali/config`, { signal: controller.signal });
      const configData = await configRes.json();
      if (configData.success) setConfig(configData.data);

      // Fetch infrazioni
      const infrazioniRes = await fetch(`${MIHUB_API}/verbali/infrazioni`, { signal: controller.signal });
      const infrazioniData = await infrazioniRes.json();
      if (infrazioniData.success) setInfrazioni(infrazioniData.data || []);

      // Fetch imprese - filtra per comune se in modalità impersonificazione
      try {
        let impreseUrl = `${MIHUB_API}/imprese?limit=100`;
        if (urlImpersonate && urlComuneId) {
          impreseUrl += `&comune_id=${urlComuneId}`;
          console.warn('[Verbale] Filtrando imprese per comune:', urlComuneId);
        }
        const impreseRes = await fetch(impreseUrl, { signal: controller.signal });
        const impreseData = await impreseRes.json();
        if (impreseData.success) setImprese(impreseData.data || []);
      } catch (e) {
        console.warn('Imprese fetch failed, continuing without');
      }

      clearTimeout(timeoutId);

      // Set default date/time
      const now = new Date();
      setViolationDate(now.toISOString().split('T')[0]);
      setViolationTime(now.toTimeString().slice(0, 5));

      // Geolocalizzazione per auto-compilare il luogo
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              // Reverse geocoding con Nominatim (OpenStreetMap)
              const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                { headers: { 'Accept-Language': 'it' } }
              );
              const geoData = await geoRes.json();
              if (geoData.address) {
                const addr = geoData.address;
                const luogo = [
                  addr.road || addr.pedestrian || addr.footway || '',
                  addr.house_number || '',
                  addr.suburb || addr.neighbourhood || '',
                  addr.city || addr.town || addr.village || addr.municipality || '',
                  addr.county ? `(${addr.county})` : ''
                ].filter(Boolean).join(' ').trim();
                setLocation(luogo || `Lat: ${latitude.toFixed(6)}, Lon: ${longitude.toFixed(6)}`);
              }
            } catch (geoErr) {
              console.warn('Reverse geocoding failed:', geoErr);
              setLocation(`Coordinate: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            }
          },
          (geoErr) => {
            console.warn('Geolocation error:', geoErr.message);
          },
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }

    } catch (err) {
      setError('Errore nel caricamento dei dati');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle impresa selection
  const handleSelectImpresa = async (impresa: Impresa) => {
    setSelectedImpresa(impresa);
    
    // Auto-fill trasgressore data con i campi corretti del database
    const nomeCompleto = impresa.rappresentante_legale_nome && impresa.rappresentante_legale_cognome
      ? `${impresa.rappresentante_legale_cognome} ${impresa.rappresentante_legale_nome}`
      : impresa.denominazione;
    setTransgressorName(nomeCompleto);
    setTransgressorCF(impresa.rappresentante_legale_cf || impresa.codice_fiscale || '');
    
    // Data e luogo di nascita
    if (impresa.rappresentante_legale_data_nascita) {
      setTransgressorBirthDate(impresa.rappresentante_legale_data_nascita.split('T')[0]);
    }
    setTransgressorBirthPlace(impresa.rappresentante_legale_luogo_nascita || '');
    
    // Residenza/Domicilio
    const residenza = impresa.rappresentante_legale_residenza_via
      ? `${impresa.rappresentante_legale_residenza_via} ${impresa.rappresentante_legale_residenza_civico || ''}, ${impresa.rappresentante_legale_residenza_cap || ''} ${impresa.rappresentante_legale_residenza_comune || ''} (${impresa.rappresentante_legale_residenza_provincia || ''})`
      : `${impresa.indirizzo_via || ''} ${impresa.indirizzo_civico || ''}, ${impresa.indirizzo_cap || ''} ${impresa.comune || ''} (${impresa.indirizzo_provincia || ''})`;
    setTransgressorAddress(residenza);
    
    setShowImpresaModal(false);
    setSearchImpresa('');
  };

  // Handle infrazione selection
  const handleSelectInfrazione = (infrazione: Infrazione) => {
    setSelectedInfrazione(infrazione);
    setAmount(infrazione.default_amount);
    setShowInfrazioneModal(false);
    setSearchInfrazione('');
  };

  // Filter infrazioni
  const filteredInfrazioni = infrazioni.filter(inf => 
    inf.code.toLowerCase().includes(searchInfrazione.toLowerCase()) ||
    inf.description.toLowerCase().includes(searchInfrazione.toLowerCase()) ||
    inf.category.toLowerCase().includes(searchInfrazione.toLowerCase())
  );

  // Filter imprese
  const filteredImprese = imprese.filter(imp =>
    imp.denominazione.toLowerCase().includes(searchImpresa.toLowerCase()) ||
    imp.partita_iva?.includes(searchImpresa) ||
    imp.codice_fiscale?.toLowerCase().includes(searchImpresa.toLowerCase())
  );

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!agentName || !agentBadge) {
      alert('❌ Compilare i dati dell\'agente accertatore');
      return;
    }
    if (!location || !violationDate) {
      alert('❌ Compilare luogo e data della violazione');
      return;
    }
    if (!transgressorName || !transgressorCF) {
      alert('❌ Compilare i dati del trasgressore');
      return;
    }
    if (!selectedInfrazione) {
      alert('❌ Selezionare il tipo di infrazione');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert('❌ Inserire un importo valido');
      return;
    }

    setSaving(true);
    
    try {
      const violationDatetime = `${violationDate}T${violationTime || '00:00'}:00`;
      
      // Ottieni il nome del comune selezionato
      const selectedComune = comuni.find(c => c.id === selectedComuneId);
      const comuneNome = selectedComune?.nome || '';
      const comuneProvincia = selectedComune?.provincia || '';
      const corpoPM = comuneNome ? `Polizia Municipale di ${comuneNome.replace('Comune di ', '')}` : 'Polizia Municipale';
      
      const payload = {
        // Comune (per filtro e intestazione verbale)
        comune_id: selectedComuneId,
        comune_nome: comuneNome,
        comune_provincia: comuneProvincia,
        corpo_pm: corpoPM,
        // Agente
        agent_name: agentName,
        agent_badge: agentBadge,
        agent_qualifica: agentQualifica,
        // Luogo e data
        location,  // Mantieni location originale con geolocalizzazione
        violation_datetime: violationDatetime,
        // Trasgressore
        impresa_id: selectedImpresa?.id || null,
        transgressor_name: transgressorName,
        transgressor_cf: transgressorCF,
        transgressor_birth_date: transgressorBirthDate || null,
        transgressor_birth_place: transgressorBirthPlace || null,
        transgressor_address: transgressorAddress,
        transgressor_doc_type: transgressorDocType || null,
        transgressor_doc_number: transgressorDocNumber || null,
        transgressor_doc_released_by: transgressorDocReleasedBy || null,
        // Proprietario
        owner_name: ownerDifferent ? ownerName : null,
        owner_cf: ownerDifferent ? ownerCF : null,
        owner_address: ownerDifferent ? ownerAddress : null,
        // Violazione
        infraction_code: selectedInfrazione.code,
        violation_description: violationDescription,
        // Dichiarazioni
        transgressor_declaration: transgressorDeclaration || null,
        contested_immediately: contestedImmediately,
        // Sanzione
        amount: parseFloat(amount),
        accessory_sanctions: accessorySanctions || null,
        // Note
        notes: notes || null
      };

      const response = await authenticatedFetch(`${MIHUB_API}/verbali`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Invio notifica automatica all'impresa/trasgressore
        let notificaInviata = false;
        try {
          await authenticatedFetch(`${MIHUB_API}/notifiche/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mittente_tipo: 'POLIZIA_MUNICIPALE',
              mittente_id: 1,
              mittente_nome: agentName || 'Polizia Municipale',
              titolo: `Verbale ${result.data.verbale_code} emesso`,
              messaggio: `È stato emesso il verbale ${result.data.verbale_code} per infrazione ${selectedInfrazione?.code || ''}. Importo: €${parseFloat(amount || '0').toFixed(2)}. ${violationDescription || ''}`.trim(),
              tipo_messaggio: 'SANZIONE',
              target_tipo: 'TRASGRESSORE',
              target_id: result.data.id,
              target_nome: transgressorName
            })
          });
          notificaInviata = true;
        } catch (notifErr) {
          console.error('Errore invio notifica automatica:', notifErr);
        }
        alert(`✅ Verbale ${result.data.verbale_code} emesso con successo!${notificaInviata ? '\n\nNotifica inviata.' : '\n\n⚠️ Notifica non inviata (errore di rete).'}`);
        setLocationPath('/dashboard-pa?tab=controlli');
      } else {
        alert('❌ Errore: ' + (result.error || 'Errore sconosciuto'));
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('❌ Errore nella creazione del verbale');
    } finally {
      setSaving(false);
    }
  };

  // Category badge color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'MERCATO': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'NEGOZIO': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'AMBULANTE': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b1220] flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-[#f59e0b] animate-pulse mx-auto mb-4" />
          <p className="text-[#e8fbff]/70">Caricamento form verbale...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b1220] flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-[#ef4444] mx-auto mb-4" />
          <p className="text-[#ef4444] font-bold mb-2">Errore di caricamento</p>
          <p className="text-[#e8fbff]/70 mb-4">{error}</p>
          <Button onClick={fetchInitialData} className="bg-[#f59e0b] text-black">Riprova</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-[#e8fbff]">
      {/* Header */}
      <div className="bg-[#1a2332] border-b border-[#f59e0b]/30 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLocationPath('/dashboard-pa?tab=controlli')}
                className="text-[#e8fbff]/70 hover:text-[#e8fbff]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Indietro
              </Button>
              <div className="h-6 w-px bg-[#e8fbff]/20" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#ef4444]/10 rounded-lg">
                  <FileText className="h-6 w-6 text-[#ef4444]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Nuovo Verbale di Contestazione</h1>
                  <p className="text-sm text-[#e8fbff]/60">Art. 14 L. 689/81 - Violazione Amministrativa</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="border-[#e8fbff]/20 text-[#e8fbff]/70"
              >
                <Printer className="h-4 w-4 mr-2" />
                Stampa
              </Button>
              <Button 
                size="sm"
                onClick={handleSubmit}
                disabled={saving}
                className="bg-[#ef4444] hover:bg-[#ef4444]/80 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Salvataggio...' : 'Emetti Verbale'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* SEZIONE 1: INTESTAZIONE */}
          <Card className="bg-[#1a2332] border-[#3b82f6]/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-[#3b82f6]" />
                <CardTitle className="text-[#e8fbff]">1. Intestazione</CardTitle>
              </div>
              <CardDescription className="text-[#e8fbff]/60">Dati dell'Ente e del Corpo di Polizia Municipale</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]/70">
                  Comune *
                  {isImpersonating && (
                    <span className="ml-2 text-xs text-[#f59e0b]">(da impersonificazione)</span>
                  )}
                </Label>
                <select 
                  value={selectedComuneId || ''}
                  onChange={(e) => setSelectedComuneId(Number(e.target.value))}
                  disabled={isImpersonating && !!impersonatedComuneId}
                  className={`w-full h-10 px-3 rounded-md bg-[#0b1220] border border-[#3b82f6]/30 text-[#e8fbff] focus:outline-none focus:ring-2 focus:ring-[#3b82f6] ${isImpersonating ? 'cursor-not-allowed opacity-75' : ''}`}
                >
                  <option value="">Seleziona Comune...</option>
                  {comuni.map(c => (
                    <option key={c.id} value={c.id}>{c.nome} ({c.provincia})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]/70">Provincia</Label>
                <Input 
                  value={comuni.find(c => c.id === selectedComuneId)?.provincia || ''} 
                  disabled 
                  className="bg-[#0b1220]/50 border-[#3b82f6]/30 text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[#e8fbff]/70">Corpo di Polizia Municipale</Label>
                <Input 
                  value={selectedComuneId ? `Polizia Municipale di ${comuni.find(c => c.id === selectedComuneId)?.nome || ''}` : ''} 
                  disabled 
                  className="bg-[#0b1220]/50 border-[#3b82f6]/30 text-[#e8fbff]"
                />
              </div>
            </CardContent>
          </Card>

          {/* SEZIONE 2: AGENTE ACCERTATORE */}
          <Card className="bg-[#1a2332] border-[#f59e0b]/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-[#f59e0b]" />
                <CardTitle className="text-[#e8fbff]">2. Agente Accertatore</CardTitle>
              </div>
              <CardDescription className="text-[#e8fbff]/60">Dati dell'agente che redige il verbale</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]/70">Nome e Cognome *</Label>
                <Input 
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Es. Mario Rossi"
                  required
                  className="bg-[#0b1220] border-[#f59e0b]/30 text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]/70">Matricola *</Label>
                <Input 
                  value={agentBadge}
                  onChange={(e) => setAgentBadge(e.target.value)}
                  placeholder="Es. PM-1234"
                  required
                  className="bg-[#0b1220] border-[#f59e0b]/30 text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]/70">Qualifica</Label>
                <select 
                  value={agentQualifica}
                  onChange={(e) => setAgentQualifica(e.target.value)}
                  className="w-full bg-[#0b1220] border border-[#f59e0b]/30 rounded-lg p-2 text-[#e8fbff]"
                >
                  <option value="Agente di Polizia Municipale">Agente di Polizia Municipale</option>
                  <option value="Ispettore di Polizia Municipale">Ispettore di Polizia Municipale</option>
                  <option value="Commissario di Polizia Municipale">Commissario di Polizia Municipale</option>
                  <option value="Comandante di Polizia Municipale">Comandante di Polizia Municipale</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* SEZIONE 3: LUOGO E DATA */}
          <Card className="bg-[#1a2332] border-[#10b981]/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#10b981]" />
                <CardTitle className="text-[#e8fbff]">3. Luogo e Data della Violazione</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[#e8fbff]/70">Luogo *</Label>
                <Input 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Es. Piazza del Popolo, Mercato Settimanale"
                  required
                  className="bg-[#0b1220] border-[#10b981]/30 text-[#e8fbff]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]/70">Data *</Label>
                  <Input 
                    type="date"
                    value={violationDate}
                    onChange={(e) => setViolationDate(e.target.value)}
                    required
                    className="bg-[#0b1220] border-[#10b981]/30 text-[#e8fbff]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]/70">Ora</Label>
                  <Input 
                    type="time"
                    value={violationTime}
                    onChange={(e) => setViolationTime(e.target.value)}
                    className="bg-[#0b1220] border-[#10b981]/30 text-[#e8fbff]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEZIONE 4: TRASGRESSORE */}
          <Card className="bg-[#1a2332] border-[#ef4444]/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-[#ef4444]" />
                  <CardTitle className="text-[#e8fbff]">4. Dati del Trasgressore</CardTitle>
                </div>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowImpresaModal(true)}
                  className="border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Cerca Impresa
                </Button>
              </div>
              {selectedImpresa && (
                <div className="mt-2 p-2 bg-[#ef4444]/10 rounded-lg flex items-center justify-between">
                  <span className="text-sm text-[#ef4444]">
                    Impresa selezionata: <strong>{selectedImpresa.denominazione}</strong> - P.IVA: {selectedImpresa.partita_iva}
                  </span>
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedImpresa(null)}
                    className="text-[#ef4444]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]/70">Nome e Cognome *</Label>
                  <Input 
                    value={transgressorName}
                    onChange={(e) => setTransgressorName(e.target.value)}
                    placeholder="Nome completo del trasgressore"
                    required
                    className="bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]/70">Codice Fiscale *</Label>
                  <Input 
                    value={transgressorCF}
                    onChange={(e) => setTransgressorCF(e.target.value.toUpperCase())}
                    placeholder="RSSMRA80A01H501Z"
                    required
                    maxLength={16}
                    className="bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff] uppercase"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]/70">Data di Nascita</Label>
                  <Input 
                    type="date"
                    value={transgressorBirthDate}
                    onChange={(e) => setTransgressorBirthDate(e.target.value)}
                    className="bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff]"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-[#e8fbff]/70">Luogo di Nascita</Label>
                  <Input 
                    value={transgressorBirthPlace}
                    onChange={(e) => setTransgressorBirthPlace(e.target.value)}
                    placeholder="Es. Roma (RM)"
                    className="bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff]"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]/70">Residenza/Domicilio</Label>
                <Input 
                  value={transgressorAddress}
                  onChange={(e) => setTransgressorAddress(e.target.value)}
                  placeholder="Via, CAP, Città (Provincia)"
                  className="bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]/70">Tipo Documento</Label>
                  <select 
                    value={transgressorDocType}
                    onChange={(e) => setTransgressorDocType(e.target.value)}
                    className="w-full bg-[#0b1220] border border-[#ef4444]/30 rounded-lg p-2 text-[#e8fbff]"
                  >
                    <option value="">Seleziona...</option>
                    <option value="CARTA_IDENTITA">Carta d'Identità</option>
                    <option value="PATENTE">Patente di Guida</option>
                    <option value="PASSAPORTO">Passaporto</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]/70">Numero Documento</Label>
                  <Input 
                    value={transgressorDocNumber}
                    onChange={(e) => setTransgressorDocNumber(e.target.value)}
                    placeholder="Numero documento"
                    className="bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]/70">Rilasciato da</Label>
                  <Input 
                    value={transgressorDocReleasedBy}
                    onChange={(e) => setTransgressorDocReleasedBy(e.target.value)}
                    placeholder="Es. Comune di Roma"
                    className="bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SEZIONE 5: PROPRIETARIO (opzionale) */}
          <Card className="bg-[#1a2332] border-[#8b5cf6]/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#8b5cf6]" />
                  <CardTitle className="text-[#e8fbff]">5. Proprietario/Obbligato in solido</CardTitle>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={ownerDifferent}
                    onChange={(e) => setOwnerDifferent(e.target.checked)}
                    className="rounded border-[#8b5cf6]/30"
                  />
                  <span className="text-sm text-[#e8fbff]/70">Diverso dal trasgressore</span>
                </label>
              </div>
            </CardHeader>
            {ownerDifferent && (
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]/70">Nome e Cognome</Label>
                  <Input 
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="bg-[#0b1220] border-[#8b5cf6]/30 text-[#e8fbff]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]/70">Codice Fiscale</Label>
                  <Input 
                    value={ownerCF}
                    onChange={(e) => setOwnerCF(e.target.value.toUpperCase())}
                    maxLength={16}
                    className="bg-[#0b1220] border-[#8b5cf6]/30 text-[#e8fbff] uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]/70">Indirizzo</Label>
                  <Input 
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                    className="bg-[#0b1220] border-[#8b5cf6]/30 text-[#e8fbff]"
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* SEZIONE 6: VIOLAZIONE */}
          <Card className="bg-[#1a2332] border-[#ef4444]/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-[#ef4444]" />
                  <CardTitle className="text-[#e8fbff]">6. Violazione Contestata</CardTitle>
                </div>
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowInfrazioneModal(true)}
                  className="border-[#ef4444]/30 text-[#ef4444] hover:bg-[#ef4444]/10"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Seleziona Infrazione
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedInfrazione ? (
                <div className="p-4 bg-[#ef4444]/10 rounded-lg border border-[#ef4444]/30">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge className={getCategoryColor(selectedInfrazione.category)}>
                        {selectedInfrazione.category}
                      </Badge>
                      <h4 className="text-lg font-semibold text-[#e8fbff] mt-2">{selectedInfrazione.code}</h4>
                      <p className="text-[#e8fbff]/80">{selectedInfrazione.description}</p>
                    </div>
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedInfrazione(null)}
                      className="text-[#ef4444]"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {selectedInfrazione.testo_legge_completo && (
                    <div className="mt-3 p-3 bg-[#0b1220] rounded border border-[#ef4444]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Scale className="h-4 w-4 text-[#ef4444]" />
                        <span className="text-sm font-medium text-[#ef4444]">Riferimento Normativo</span>
                      </div>
                      <p className="text-sm text-[#e8fbff]/70">{selectedInfrazione.testo_legge_completo}</p>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-4 text-sm">
                    <span className="text-[#e8fbff]/60">Importo: Min €{selectedInfrazione.min_amount} - Max €{selectedInfrazione.max_amount}</span>
                    <span className="text-[#ef4444] font-medium">Default: €{selectedInfrazione.default_amount}</span>
                  </div>
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-[#ef4444]/30 rounded-lg text-center">
                  <AlertTriangle className="h-12 w-12 text-[#ef4444]/50 mx-auto mb-3" />
                  <p className="text-[#e8fbff]/60">Nessuna infrazione selezionata</p>
                  <p className="text-sm text-[#e8fbff]/40 mt-1">Clicca "Seleziona Infrazione" per scegliere dal catalogo</p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-[#e8fbff]/70">Descrizione dei Fatti</Label>
                <Textarea 
                  value={violationDescription}
                  onChange={(e) => setViolationDescription(e.target.value)}
                  placeholder="Descrizione dettagliata della violazione accertata..."
                  rows={4}
                  className="bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff]"
                />
              </div>
            </CardContent>
          </Card>

          {/* SEZIONE 7: DICHIARAZIONI */}
          <Card className="bg-[#1a2332] border-[#f59e0b]/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-[#f59e0b]" />
                <CardTitle className="text-[#e8fbff]">7. Dichiarazioni</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]/70">Dichiarazioni del Trasgressore</Label>
                <Textarea 
                  value={transgressorDeclaration}
                  onChange={(e) => setTransgressorDeclaration(e.target.value)}
                  placeholder="Eventuali dichiarazioni rilasciate dal trasgressore..."
                  rows={3}
                  className="bg-[#0b1220] border-[#f59e0b]/30 text-[#e8fbff]"
                />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio"
                    name="contested"
                    checked={contestedImmediately}
                    onChange={() => setContestedImmediately(true)}
                    className="text-[#f59e0b]"
                  />
                  <span className="text-[#e8fbff]/70">Contestazione immediata</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio"
                    name="contested"
                    checked={!contestedImmediately}
                    onChange={() => setContestedImmediately(false)}
                    className="text-[#f59e0b]"
                  />
                  <span className="text-[#e8fbff]/70">Contestazione differita (notifica successiva)</span>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* SEZIONE 8: SANZIONE */}
          <Card className="bg-[#1a2332] border-[#ef4444]/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Euro className="h-5 w-5 text-[#ef4444]" />
                <CardTitle className="text-[#e8fbff]">8. Sanzione Amministrativa</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]/70">Importo Sanzione (€) *</Label>
                  <Input 
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    required
                    min="0"
                    step="0.01"
                    className="bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff] text-xl font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]/70">Importo Ridotto (-30%)</Label>
                  <Input 
                    value={amount ? `€ ${(parseFloat(amount) * 0.7).toFixed(2)}` : '€ 0.00'}
                    disabled
                    className="bg-[#10b981]/10 border-[#10b981]/30 text-[#10b981] font-medium"
                  />
                  <p className="text-xs text-[#e8fbff]/40">Pagamento entro 5 giorni</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-[#e8fbff]/70">Scadenza Ordinaria</Label>
                  <Input 
                    value={violationDate ? new Date(new Date(violationDate).getTime() + 60*24*60*60*1000).toLocaleDateString('it-IT') : ''}
                    disabled
                    className="bg-[#0b1220]/50 border-[#ef4444]/30 text-[#e8fbff]"
                  />
                  <p className="text-xs text-[#e8fbff]/40">60 giorni dalla contestazione</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]/70">Sanzioni Accessorie</Label>
                <Textarea 
                  value={accessorySanctions}
                  onChange={(e) => setAccessorySanctions(e.target.value)}
                  placeholder="Es. Sequestro merce, sospensione attività..."
                  rows={2}
                  className="bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff]"
                />
              </div>
            </CardContent>
          </Card>

          {/* SEZIONE 9: NOTE */}
          <Card className="bg-[#1a2332] border-[#e8fbff]/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#e8fbff]/50" />
                <CardTitle className="text-[#e8fbff]">9. Note Aggiuntive</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Eventuali note o osservazioni..."
                rows={3}
                className="bg-[#0b1220] border-[#e8fbff]/20 text-[#e8fbff]"
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-4">
            <Button 
              type="button"
              variant="outline"
              onClick={() => setLocationPath('/dashboard-pa?tab=controlli')}
              className="border-[#e8fbff]/20 text-[#e8fbff]/70"
            >
              Annulla
            </Button>
            <Button 
              type="submit"
              disabled={saving}
              className="bg-[#ef4444] hover:bg-[#ef4444]/80 text-white px-8"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Emissione in corso...' : 'Emetti Verbale'}
            </Button>
          </div>
        </form>
      </div>

      {/* Modal Selezione Infrazione */}
      {showInfrazioneModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-[#ef4444]/30 rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-[#ef4444]/30 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#e8fbff]">Seleziona Tipo Infrazione</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowInfrazioneModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 border-b border-[#ef4444]/20">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#e8fbff]/40" />
                <Input 
                  value={searchInfrazione}
                  onChange={(e) => setSearchInfrazione(e.target.value)}
                  placeholder="Cerca per codice, descrizione o categoria..."
                  className="pl-10 bg-[#0b1220] border-[#ef4444]/30 text-[#e8fbff]"
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[50vh] p-4 space-y-2">
              {filteredInfrazioni.map(inf => (
                <div 
                  key={inf.id}
                  onClick={() => handleSelectInfrazione(inf)}
                  className="p-4 bg-[#0b1220] rounded-lg border border-[#ef4444]/20 hover:border-[#ef4444]/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getCategoryColor(inf.category)}>{inf.category}</Badge>
                        <span className="font-mono text-sm text-[#ef4444]">{inf.code}</span>
                      </div>
                      <p className="text-[#e8fbff] font-medium">{inf.description}</p>
                      {inf.testo_legge_completo && (
                        <p className="text-sm text-[#e8fbff]/50 mt-1 line-clamp-2">{inf.testo_legge_completo}</p>
                      )}
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-[#ef4444]">€{inf.default_amount}</p>
                      <p className="text-xs text-[#e8fbff]/40">Min €{inf.min_amount} - Max €{inf.max_amount}</p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredInfrazioni.length === 0 && (
                <div className="text-center py-8 text-[#e8fbff]/50">
                  Nessuna infrazione trovata
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Selezione Impresa */}
      {showImpresaModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a2332] border border-[#3b82f6]/30 rounded-lg w-full max-w-3xl max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-[#3b82f6]/30 flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#e8fbff]">Cerca Impresa</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowImpresaModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 border-b border-[#3b82f6]/20">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#e8fbff]/40" />
                <Input 
                  value={searchImpresa}
                  onChange={(e) => setSearchImpresa(e.target.value)}
                  placeholder="Cerca per denominazione, P.IVA o C.F...."
                  className="pl-10 bg-[#0b1220] border-[#3b82f6]/30 text-[#e8fbff]"
                />
              </div>
            </div>
            <div className="overflow-y-auto max-h-[50vh] p-4 space-y-2">
              {filteredImprese.slice(0, 50).map(imp => (
                <div 
                  key={imp.id}
                  onClick={() => handleSelectImpresa(imp)}
                  className="p-4 bg-[#0b1220] rounded-lg border border-[#3b82f6]/20 hover:border-[#3b82f6]/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#e8fbff] font-medium">{imp.denominazione}</p>
                      <p className="text-sm text-[#e8fbff]/60">
                        P.IVA: {imp.partita_iva} {imp.codice_fiscale && `| C.F.: ${imp.codice_fiscale}`}
                      </p>
                      {imp.indirizzo && (
                        <p className="text-xs text-[#e8fbff]/40 mt-1">{imp.indirizzo}, {imp.citta}</p>
                      )}
                    </div>
                    <CheckCircle className="h-5 w-5 text-[#3b82f6]/50" />
                  </div>
                </div>
              ))}
              {filteredImprese.length === 0 && (
                <div className="text-center py-8 text-[#e8fbff]/50">
                  Nessuna impresa trovata
                </div>
              )}
              {filteredImprese.length > 50 && (
                <div className="text-center py-4 text-[#e8fbff]/40 text-sm">
                  Mostrati i primi 50 risultati. Affina la ricerca per vedere altri risultati.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
