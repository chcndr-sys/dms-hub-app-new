import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Building2, FileCheck, AlertCircle, CheckCircle, Clock } from 'lucide-react';

// ============================================================================
// INTERFACCE TYPESCRIPT
// ============================================================================

export interface ImpresaDTO {
  id_impresa: number;
  ragione_sociale: string;
  piva: string;
  codice_fiscale: string;
  comune: string;
  settore?: string;
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
// DATI MOCK (da sostituire con chiamate API reali)
// ============================================================================

const MOCK_IMPRESE: ImpresaDTO[] = [
  {
    id_impresa: 1,
    ragione_sociale: 'Mercato Centrale S.r.l.',
    piva: '01234567890',
    codice_fiscale: '01234567890',
    comune: 'Bologna',
    settore: 'Commercio al dettaglio',
    num_qualificazioni_attive: 3
  },
  {
    id_impresa: 2,
    ragione_sociale: 'Alimentari Rossi & C.',
    piva: '09876543210',
    codice_fiscale: '09876543210',
    comune: 'Modena',
    settore: 'Alimentari',
    num_qualificazioni_attive: 2
  },
  {
    id_impresa: 3,
    ragione_sociale: 'Distribuzione Emilia S.p.A.',
    piva: '11223344556',
    codice_fiscale: '11223344556',
    comune: 'Parma',
    settore: 'Logistica e distribuzione',
    num_qualificazioni_attive: 5
  },
  {
    id_impresa: 4,
    ragione_sociale: 'Bio Market Italia',
    piva: '66778899001',
    codice_fiscale: '66778899001',
    comune: 'Reggio Emilia',
    settore: 'Biologico',
    num_qualificazioni_attive: 1
  }
];

const MOCK_QUALIFICAZIONI: Record<number, QualificazioneDTO[]> = {
  1: [
    {
      id_qualificazione: 101,
      id_impresa: 1,
      tipo: 'CONCESSIONE MERCATO',
      ente_rilascio: 'Comune di Bologna',
      data_rilascio: '2023-01-15',
      data_scadenza: '2025-01-15',
      stato: 'ATTIVA',
      note: 'Concessione per area mercato coperto settore alimentare'
    },
    {
      id_qualificazione: 102,
      id_impresa: 1,
      tipo: 'DURC',
      ente_rilascio: 'INPS',
      data_rilascio: '2024-11-01',
      data_scadenza: '2025-02-01',
      stato: 'ATTIVA',
      note: 'Documento Unico Regolarità Contributiva'
    },
    {
      id_qualificazione: 103,
      id_impresa: 1,
      tipo: 'ISO 9001',
      ente_rilascio: 'Bureau Veritas',
      data_rilascio: '2022-06-10',
      data_scadenza: '2025-06-10',
      stato: 'ATTIVA',
      note: 'Certificazione qualità sistema gestione'
    }
  ],
  2: [
    {
      id_qualificazione: 201,
      id_impresa: 2,
      tipo: 'HACCP',
      ente_rilascio: 'ASL Modena',
      data_rilascio: '2024-03-20',
      data_scadenza: '2026-03-20',
      stato: 'ATTIVA',
      note: 'Certificazione igiene alimentare'
    },
    {
      id_qualificazione: 202,
      id_impresa: 2,
      tipo: 'DURC',
      ente_rilascio: 'INPS',
      data_rilascio: '2024-10-15',
      data_scadenza: '2024-12-01',
      stato: 'IN_VERIFICA',
      note: 'In attesa di rinnovo'
    }
  ],
  3: [
    {
      id_qualificazione: 301,
      id_impresa: 3,
      tipo: 'CONCESSIONE MERCATO',
      ente_rilascio: 'Comune di Parma',
      data_rilascio: '2021-05-10',
      data_scadenza: '2024-11-30',
      stato: 'SCADUTA',
      note: 'Necessario rinnovo urgente'
    },
    {
      id_qualificazione: 302,
      id_impresa: 3,
      tipo: 'ISO 14001',
      ente_rilascio: 'TÜV Italia',
      data_rilascio: '2023-09-01',
      data_scadenza: '2026-09-01',
      stato: 'ATTIVA',
      note: 'Certificazione ambientale'
    },
    {
      id_qualificazione: 303,
      id_impresa: 3,
      tipo: 'DURC',
      ente_rilascio: 'INPS',
      data_rilascio: '2024-11-20',
      data_scadenza: '2025-02-20',
      stato: 'ATTIVA'
    },
    {
      id_qualificazione: 304,
      id_impresa: 3,
      tipo: 'HACCP',
      ente_rilascio: 'ASL Parma',
      data_rilascio: '2024-01-10',
      data_scadenza: '2026-01-10',
      stato: 'ATTIVA'
    },
    {
      id_qualificazione: 305,
      id_impresa: 3,
      tipo: 'ISO 22000',
      ente_rilascio: 'DNV',
      data_rilascio: '2023-07-15',
      data_scadenza: '2026-07-15',
      stato: 'ATTIVA',
      note: 'Sicurezza alimentare'
    }
  ],
  4: [
    {
      id_qualificazione: 401,
      id_impresa: 4,
      tipo: 'BIOLOGICO EU',
      ente_rilascio: 'ICEA',
      data_rilascio: '2024-02-01',
      data_scadenza: '2025-02-01',
      stato: 'ATTIVA',
      note: 'Certificazione prodotti biologici'
    }
  ]
};

// ============================================================================
// COMPONENTE PRINCIPALE
// ============================================================================

export default function ImpreseQualificazioniPanel() {
  const [imprese, setImprese] = useState<ImpresaDTO[]>([]);
  const [selectedImpresa, setSelectedImpresa] = useState<ImpresaDTO | null>(null);
  const [qualificazioni, setQualificazioni] = useState<QualificazioneDTO[]>([]);
  const [loading, setLoading] = useState(false);

  // Carica lista imprese (mock per ora)
  useEffect(() => {
    setLoading(true);
    // Simula chiamata API
    setTimeout(() => {
      setImprese(MOCK_IMPRESE);
      setLoading(false);
    }, 300);
  }, []);

  // Carica qualificazioni quando si seleziona un'impresa
  useEffect(() => {
    if (selectedImpresa) {
      setLoading(true);
      // Simula chiamata API
      setTimeout(() => {
        setQualificazioni(MOCK_QUALIFICAZIONI[selectedImpresa.id_impresa] || []);
        setLoading(false);
      }, 200);
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
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
        </CardHeader>
        <CardContent>
          {loading && !selectedImpresa ? (
            <div className="text-center py-8 text-gray-500">Caricamento...</div>
          ) : (
            <div className="overflow-auto max-h-[600px]">
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
                  {imprese.map((impresa) => (
                    <TableRow
                      key={impresa.id_impresa}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        selectedImpresa?.id_impresa === impresa.id_impresa
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : ''
                      }`}
                      onClick={() => setSelectedImpresa(impresa)}
                    >
                      <TableCell className="font-medium">
                        {impresa.ragione_sociale}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {impresa.piva}
                      </TableCell>
                      <TableCell className="text-sm">{impresa.comune}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {impresa.num_qualificazioni_attive || 0}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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
              ? `Qualificazioni di ${selectedImpresa.ragione_sociale}`
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
  );
}
