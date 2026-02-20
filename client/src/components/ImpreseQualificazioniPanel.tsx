import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Building2, FileCheck, AlertCircle, CheckCircle, Clock, Users, Search, X, TrendingUp } from 'lucide-react';
import { addComuneIdToUrl } from '@/hooks/useImpersonation';
import { MIHUB_API_BASE_URL } from '@/config/api';

// ============================================================================
// INTERFACCE TYPESCRIPT
// ============================================================================

export interface ImpresaDTO {
  // Campi dall'API (nomi originali)
  id: number;
  denominazione: string;
  partita_iva: string;
  codice_fiscale: string;
  comune: string;
  settore?: string;
  concessioni_attive?: any[];
  autorizzazioni_attive?: any[];
  qualificazioni?: any[];
  // Alias per compatibilità
  id_impresa?: number;
  ragione_sociale?: string;
  piva?: string;
  num_qualificazioni_attive?: number;
}

export interface QualificazioneDTO {
  id_qualificazione: number;
  id_impresa: number;
  tipo: string;
  ente_rilascio: string;
  data_rilascio: string;
  data_scadenza: string;
  stato: 'ATTIVA' | 'SCADUTA' | 'IN_VERIFICA';
  note?: string;
}

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_BASE_URL = MIHUB_API_BASE_URL;

// NOTA: Dati mock rimossi. Se l'API non risponde, mostrare stato vuoto.

// ============================================================================
// COMPONENTE PRINCIPALE
// ============================================================================

export default function ImpreseQualificazioniPanel() {
  const [imprese, setImprese] = useState<ImpresaDTO[]>([]);
  const [selectedImpresa, setSelectedImpresa] = useState<ImpresaDTO | null>(null);
  const [qualificazioni, setQualificazioni] = useState<QualificazioneDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  // Carica lista imprese da API
  useEffect(() => {
    const fetchImprese = async () => {
      setLoading(true);
      try {
        const response = await fetch(addComuneIdToUrl(`${API_BASE_URL}/api/imprese?limit=200`));
        const data = await response.json();
        if (data.success && data.data) {
          // Mappa i campi dall'API ai nomi usati nel frontend
          const mappedImprese = data.data.map((imp: any) => ({
            ...imp,
            id_impresa: imp.id,
            ragione_sociale: imp.denominazione,
            piva: imp.partita_iva,
            num_qualificazioni_attive: (imp.concessioni_attive?.length || 0) + (imp.qualificazioni?.length || 0)
          }));
          setImprese(mappedImprese);
        } else {
          setImprese([]);
        }
      } catch (error) {
        console.error('Error fetching imprese:', error);
        setImprese([]);
      } finally {
        setLoading(false);
      }
    };
    fetchImprese();
  }, []);

  // Carica qualificazioni quando si seleziona un'impresa
  useEffect(() => {
    if (selectedImpresa) {
      const fetchQualificazioni = async () => {
        setLoading(true);
        try {
          const response = await fetch(addComuneIdToUrl(`${API_BASE_URL}/api/imprese/${selectedImpresa.id}/qualificazioni`));
          const data = await response.json();
          if (data.success) {
            setQualificazioni(data.data);
          } else {
            setQualificazioni([]);
          }
        } catch (error) {
          console.error('Error fetching qualificazioni:', error);
          setQualificazioni([]);
        } finally {
          setLoading(false);
        }
      };
      fetchQualificazioni();
    } else {
      setQualificazioni([]);
    }
  }, [selectedImpresa]);

  const getStatoBadge = (stato: QualificazioneDTO['stato']) => {
    switch (stato) {
      case 'ATTIVA':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="w-3 h-3 mr-1" />
            Attiva
          </Badge>
        );
      case 'SCADUTA':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Scaduta
          </Badge>
        );
      case 'IN_VERIFICA':
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            <Clock className="w-3 h-3 mr-1" />
            In Verifica
          </Badge>
        );
    }
  };

  // Calcola statistiche
  const totalConcessioni = imprese.reduce((acc, i) => acc + (i.concessioni_attive?.length || 0), 0);
  const totalQualificazioni = imprese.reduce((acc, i) => acc + (i.num_qualificazioni_attive || 0), 0);
  const comuniUnici = Array.from(new Set(imprese.map(i => i.comune).filter(Boolean))).length;
  const mediaConcessioni = imprese.length > 0 ? (totalConcessioni / imprese.length).toFixed(1) : '0';
  
  // Filtra imprese in base alla ricerca
  const filteredImprese = imprese.filter(impresa => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      (impresa.ragione_sociale || impresa.denominazione)?.toLowerCase().includes(query) ||
      (impresa.piva || impresa.partita_iva)?.toLowerCase().includes(query) ||
      impresa.codice_fiscale?.toLowerCase().includes(query) ||
      impresa.comune?.toLowerCase().includes(query) ||
      impresa.settore?.toLowerCase().includes(query)
    );
  });

  // Paginazione client-side
  const totalPages = Math.ceil(filteredImprese.length / PAGE_SIZE);
  const paginatedImprese = filteredImprese.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Reset pagina quando cambia la ricerca
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="space-y-6 p-6">
      {/* Statistiche */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-cyan-400 text-sm mb-1">
              <Building2 className="w-4 h-4" />
              Imprese Totali
            </div>
            <div className="text-2xl font-bold text-white">{imprese.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-400 text-sm mb-1">
              <FileCheck className="w-4 h-4" />
              Concessioni Attive
            </div>
            <div className="text-2xl font-bold text-white">{totalConcessioni}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-purple-400 text-sm mb-1">
              <Users className="w-4 h-4" />
              Comuni Coperti
            </div>
            <div className="text-2xl font-bold text-white">{comuniUnici}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-400 text-sm mb-1">
              <TrendingUp className="w-4 h-4" />
              Media Concess./Impresa
            </div>
            <div className="text-2xl font-bold text-white">{mediaConcessioni}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* COLONNA SINISTRA: Lista Imprese */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Imprese Registrate
            </CardTitle>
            <CardDescription>
              Seleziona un'impresa per visualizzare le sue qualificazioni
            </CardDescription>
            {/* Barra di ricerca */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca per ragione sociale, P.IVA, comune..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading && !selectedImpresa ? (
              <div className="text-center py-8 text-gray-500">Caricamento...</div>
            ) : filteredImprese.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? `Nessuna impresa trovata per "${searchQuery}"` : 'Nessuna impresa registrata'}
              </div>
            ) : (
              <>
              <div className="overflow-auto max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ragione Sociale</TableHead>
                      <TableHead>P.IVA</TableHead>
                      <TableHead>Comune</TableHead>
                      <TableHead className="text-center">Qualif.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedImprese.map((impresa) => (
                    <TableRow
                      key={impresa.id || impresa.id_impresa}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        (selectedImpresa?.id || selectedImpresa?.id_impresa) === (impresa.id || impresa.id_impresa)
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : ''
                      }`}
                      onClick={() => setSelectedImpresa(impresa)}
                    >
                      <TableCell className="font-medium">
                        {impresa.ragione_sociale || impresa.denominazione}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {impresa.piva || impresa.partita_iva}
                      </TableCell>
                      <TableCell className="text-sm">{impresa.comune}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {(impresa.concessioni_attive?.length || 0)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Controlli paginazione */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 px-2">
                <span className="text-sm text-gray-400">
                  {filteredImprese.length} imprese totali — Pagina {currentPage} di {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Precedente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Successiva
                  </Button>
                </div>
              </div>
            )}
          </>
          )}
        </CardContent>
      </Card>

      {/* COLONNA DESTRA: Qualificazioni */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            Qualificazioni
          </CardTitle>
          <CardDescription>
            {selectedImpresa
              ? `Qualificazioni di ${selectedImpresa.ragione_sociale || selectedImpresa.denominazione}`
              : 'Seleziona un\'impresa per visualizzare le qualificazioni'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedImpresa ? (
            <div className="text-center py-16 text-gray-400">
              <FileCheck className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Nessuna impresa selezionata</p>
            </div>
          ) : loading ? (
            <div className="text-center py-8 text-gray-500">Caricamento...</div>
          ) : qualificazioni.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p>Nessuna qualificazione trovata</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ente</TableHead>
                    <TableHead>Scadenza</TableHead>
                    <TableHead>Stato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {qualificazioni.map((qual) => (
                    <TableRow key={qual.id_qualificazione}>
                      <TableCell className="font-medium">{qual.tipo}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {qual.ente_rilascio}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(qual.data_scadenza).toLocaleDateString('it-IT')}
                      </TableCell>
                      <TableCell>{getStatoBadge(qual.stato)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Note aggiuntive */}
              {qualificazioni.some((q) => q.note) && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">Note:</h4>
                  <ul className="space-y-1 text-sm text-gray-600">
                    {qualificazioni
                      .filter((q) => q.note)
                      .map((q) => (
                        <li key={q.id_qualificazione}>
                          <strong>{q.tipo}:</strong> {q.note}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
