import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Printer, Search } from 'lucide-react';
import { toast } from 'sonner';

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

export default function ConcessioneForm({ onCancel, onSubmit }: { onCancel: () => void, onSubmit: (data: any) => void }) {
  const [formData, setFormData] = useState({
    // Dati Generali
    numero_concessione: '2025/' + Math.floor(Math.random() * 1000),
    data_rilascio: new Date().toISOString().split('T')[0],
    durata_anni: '12',
    data_scadenza: '',
    tipo_concessione: 'subingresso', // nuova, subingresso, conversione
    
    // Concessionario
    cf_concessionario: '',
    ragione_sociale: '',
    nome: '',
    cognome: '',
    data_nascita: '',
    luogo_nascita: '',
    residenza_via: '',
    residenza_comune: '',
    residenza_cap: '',
    
    // Posteggio
    mercato: 'Modena - Novi Sad',
    ubicazione: 'Piazza VIII Agosto e Zone Adiacenti',
    posteggio: '',
    fila: '1',
    mq: '39',
    dimensioni_lineari: '6 x 6.5',
    giorno: 'Sabato',
    attrezzature: 'Banco e automezzo',
    merceologia: 'Non Alimentare',
    
    // Dati Economici
    canone_unico: '851,76',
    
    // Riferimenti
    scia_precedente_numero: '',
    scia_precedente_data: '',
    scia_precedente_comune: 'BOLOGNA'
  });

  const handleLookup = async () => {
    try {
      const res = await fetch(`${API_URL}/api/imprese?codice_fiscale=${formData.cf_concessionario}`);
      const json = await res.json();
      
      if (json.success && json.data && json.data.length > 0) {
        const data = json.data[0];
        setFormData(prev => ({
          ...prev,
          ragione_sociale: data.denominazione,
          residenza_comune: data.comune,
          residenza_via: `${data.indirizzo_via} ${data.indirizzo_civico}`,
          residenza_cap: data.cap || ''
        }));
        toast.success('Concessionario trovato!', { description: data.denominazione });
      } else {
        toast.error('Concessionario non trovato', { description: 'Inserire i dati manualmente' });
      }
    } catch (error) {
      console.error(error);
      toast.error('Errore ricerca', { description: 'Impossibile contattare il server' });
    }
  };

  const calculateExpiry = (years: string) => {
    const date = new Date(formData.data_rilascio);
    date.setFullYear(date.getFullYear() + parseInt(years));
    setFormData(prev => ({
      ...prev,
      durata_anni: years,
      data_scadenza: date.toISOString().split('T')[0]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card className="bg-[#0a1628] border-[#1e293b] max-w-4xl mx-auto max-h-[90vh] overflow-y-auto">
      <CardHeader>
        <CardTitle className="text-[#e8fbff] flex items-center gap-2">
          <FileText className="text-[#00f0ff]" />
          Generazione Atto di Concessione
        </CardTitle>
        <CardDescription className="text-[#e8fbff]/60">
          Rilascio Concessione Decennale/Dodicennale per Posteggio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* DATI ATTO */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Numero Concessione</Label>
              <Input 
                value={formData.numero_concessione}
                readOnly
                className="bg-[#020817]/50 border-[#1e293b] text-[#e8fbff]/60"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Data Rilascio</Label>
              <Input 
                type="date"
                value={formData.data_rilascio}
                onChange={(e) => setFormData({...formData, data_rilascio: e.target.value})}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[#e8fbff]">Durata (Anni)</Label>
              <Select value={formData.durata_anni} onValueChange={calculateExpiry}>
                <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 Anni</SelectItem>
                  <SelectItem value="12">12 Anni</SelectItem>
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label className="text-[#e8fbff]">Tipo Concessione</Label>
              <Select value={formData.tipo_concessione} onValueChange={(val) => setFormData({...formData, tipo_concessione: val})}>
                <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nuova">Nuova Concessione</SelectItem>
                  <SelectItem value="subingresso">Subingresso</SelectItem>
                  <SelectItem value="conversione">Conversione</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* CONCESSIONARIO */}
          <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
            <h3 className="text-sm font-semibold text-[#e8fbff]">Dati Concessionario</h3>
            
            {/* Riga 1: CF e Ragione Sociale */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="Codice Fiscale"
                  value={formData.cf_concessionario}
                  onChange={(e) => setFormData({...formData, cf_concessionario: e.target.value.toUpperCase()})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
                <Button type="button" onClick={handleLookup} variant="secondary">
                  <Search className="w-4 h-4" />
                </Button>
              </div>
              <Input 
                placeholder="Ragione Sociale"
                value={formData.ragione_sociale}
                onChange={(e) => setFormData({...formData, ragione_sociale: e.target.value})}
                className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
              />
            </div>

            {/* Riga 2: Dati Personali */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="space-y-2">
                <Label className="text-[#e8fbff]">Nome</Label>
                <Input 
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Cognome</Label>
                <Input 
                  value={formData.cognome}
                  onChange={(e) => setFormData({...formData, cognome: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Data di Nascita</Label>
                <Input 
                  type="date"
                  value={formData.data_nascita}
                  onChange={(e) => setFormData({...formData, data_nascita: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Luogo di Nascita</Label>
                <Input 
                  value={formData.luogo_nascita}
                  onChange={(e) => setFormData({...formData, luogo_nascita: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>

            {/* Riga 3: Residenza */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Residenza (Via/Piazza)</Label>
                <Input 
                  value={formData.residenza_via}
                  onChange={(e) => setFormData({...formData, residenza_via: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Comune</Label>
                <Input 
                  value={formData.residenza_comune}
                  onChange={(e) => setFormData({...formData, residenza_comune: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">CAP</Label>
                <Input 
                  value={formData.residenza_cap}
                  onChange={(e) => setFormData({...formData, residenza_cap: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>
          </div>

          {/* POSTEGGIO */}
          <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
            <h3 className="text-sm font-semibold text-[#e8fbff]">Dati Posteggio</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Mercato</Label>
                <Input value={formData.mercato} readOnly className="bg-[#020817]/50 border-[#1e293b] text-[#e8fbff]/60" />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Ubicazione</Label>
                <Input 
                  value={formData.ubicazione} 
                  onChange={(e) => setFormData({...formData, ubicazione: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Fila</Label>
                <Input 
                  value={formData.fila} 
                  onChange={(e) => setFormData({...formData, fila: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Posteggio</Label>
                <Select onValueChange={(val) => setFormData({...formData, posteggio: val})}>
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="16">16</SelectItem>
                    <SelectItem value="A01">A01</SelectItem>
                    <SelectItem value="A02">A02</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">MQ</Label>
                <Input 
                  value={formData.mq} 
                  onChange={(e) => setFormData({...formData, mq: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Dimensioni (m x m)</Label>
                <Input 
                  value={formData.dimensioni_lineari} 
                  onChange={(e) => setFormData({...formData, dimensioni_lineari: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label className="text-[#e8fbff]">Attrezzature</Label>
                <Input 
                  value={formData.attrezzature} 
                  onChange={(e) => setFormData({...formData, attrezzature: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Merceologia</Label>
                <Input 
                  value={formData.merceologia} 
                  onChange={(e) => setFormData({...formData, merceologia: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
                />
              </div>
            </div>
          </div>

          {/* RIFERIMENTI E CANONE */}
          <div className="space-y-4 border p-4 rounded-lg border-[#1e293b]">
            <h3 className="text-sm font-semibold text-[#e8fbff]">Riferimenti e Canone</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">SCIA Precedente N.</Label>
                <Input 
                  value={formData.scia_precedente_numero} 
                  onChange={(e) => setFormData({...formData, scia_precedente_numero: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Data SCIA</Label>
                <Input 
                  type="date"
                  value={formData.scia_precedente_data} 
                  onChange={(e) => setFormData({...formData, scia_precedente_data: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Canone Annuo (€)</Label>
                <Input 
                  value={formData.canone_unico} 
                  onChange={(e) => setFormData({...formData, canone_unico: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]" 
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel} className="border-[#e8fbff]/20 text-[#e8fbff]">
              Annulla
            </Button>
            <Button type="submit" className="bg-[#00f0ff] text-black hover:bg-[#00f0ff]/90">
              <Printer className="mr-2 h-4 w-4" />
              Genera Atto
            </Button>
          </div>

        </form>
      </CardContent>
    </Card>
  );
}
