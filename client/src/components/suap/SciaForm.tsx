import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Search, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// API URL
const API_URL = import.meta.env.VITE_API_URL || 'https://orchestratore.mio-hub.me';

const MOCK_MERCATI = {
  'modena': {
    nome: 'Mercato Novi Sad',
    comune: 'Modena',
    posteggi: ['A01', 'A02', 'B01', 'B05', '1/16']
  }
};

export default function SciaForm({ onCancel, onSubmit }: { onCancel: () => void, onSubmit: (data: any) => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Sezione A - Subentrante
    cf_subentrante: '',
    ragione_sociale_sub: '',
    nome_sub: '',
    cognome_sub: '',
    data_nascita_sub: '',
    luogo_nascita_sub: '',
    residenza_via_sub: '',
    residenza_comune_sub: '',
    residenza_cap_sub: '',
    qualita_sub: 'titolare', // titolare o legale_rappresentante
    sede_via_sub: '',
    sede_comune_sub: '',
    sede_cap_sub: '',
    pec_sub: '',
    
    // Sezione B - Cedente
    cf_cedente: '',
    ragione_sociale_ced: '',
    scia_precedente_protocollo: '',
    scia_precedente_data: '',
    scia_precedente_comune: 'BOLOGNA',

    // Sezione C - Posteggio
    mercato: '',
    posteggio: '',
    fila: '',
    dimensioni_mq: '',
    dimensioni_lineari: '', // es. 6 x 6.5
    settore: '',
    merceologia: 'non_alimentare', // alimentare, non_alimentare, misto
    attrezzature: 'banco_automezzo', // banco, automezzo, banco_automezzo

    // Sezione D - Atto
    notaio: '',
    repertorio: '',
    data_atto: ''
  });

  const handleLookupSubentrante = async () => {
    try {
      const res = await fetch(`${API_URL}/api/imprese?codice_fiscale=${formData.cf_subentrante}`);
      const json = await res.json();
      
      if (json.success && json.data && json.data.length > 0) {
        const data = json.data[0];
        setFormData(prev => ({
          ...prev,
          ragione_sociale_sub: data.denominazione,
          sede_comune_sub: data.comune,
          sede_via_sub: `${data.indirizzo_via} ${data.indirizzo_civico}`,
          sede_cap_sub: data.cap || '',
          pec_sub: data.pec
        }));
        toast.success('Impresa trovata nel DB!', { description: data.denominazione });
      } else {
        toast.error('Impresa non trovata', { description: 'Inserire i dati manualmente' });
      }
    } catch (error) {
      console.error(error);
      toast.error('Errore ricerca', { description: 'Impossibile contattare il server' });
    }
  };

  const handleLookupCedente = async () => {
    try {
      const res = await fetch(`${API_URL}/api/imprese?codice_fiscale=${formData.cf_cedente}`);
      const json = await res.json();
      
      if (json.success && json.data && json.data.length > 0) {
        const data = json.data[0];
        setFormData(prev => ({
          ...prev,
          ragione_sociale_ced: data.denominazione
        }));
        toast.success('Cedente trovato nel DB!', { description: data.denominazione });
      } else {
        toast.error('Cedente non trovato', { description: 'Inserire i dati manualmente' });
      }
    } catch (error) {
      console.error(error);
      toast.error('Errore ricerca', { description: 'Impossibile contattare il server' });
    }
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
          Compilazione Guidata SCIA Subingresso
        </CardTitle>
        <CardDescription className="text-[#e8fbff]/60">
          Modello Unificato Regionale - Commercio su Aree Pubbliche
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* SEZIONE A: SUBENTRANTE */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#e8fbff] border-b border-[#1e293b] pb-2">
              A. Dati Subentrante (Cessionario)
            </h3>
            
            {/* Riga 1: CF e Ricerca */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Codice Fiscale / P.IVA *</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.cf_subentrante}
                    onChange={(e) => setFormData({...formData, cf_subentrante: e.target.value.toUpperCase()})}
                    placeholder="Es. RSSMRA..."
                    className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                  />
                  <Button type="button" onClick={handleLookupSubentrante} variant="secondary">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Ragione Sociale / Denominazione</Label>
                <Input 
                  value={formData.ragione_sociale_sub}
                  onChange={(e) => setFormData({...formData, ragione_sociale_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>

            {/* Riga 2: Dati Personali Titolare */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <div className="space-y-2">
                <Label className="text-[#e8fbff]">Nome</Label>
                <Input 
                  value={formData.nome_sub}
                  onChange={(e) => setFormData({...formData, nome_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Cognome</Label>
                <Input 
                  value={formData.cognome_sub}
                  onChange={(e) => setFormData({...formData, cognome_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Data di Nascita</Label>
                <Input 
                  type="date"
                  value={formData.data_nascita_sub}
                  onChange={(e) => setFormData({...formData, data_nascita_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Luogo di Nascita</Label>
                <Input 
                  value={formData.luogo_nascita_sub}
                  onChange={(e) => setFormData({...formData, luogo_nascita_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>

            {/* Riga 3: Residenza Titolare */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Residenza (Via/Piazza)</Label>
                <Input 
                  value={formData.residenza_via_sub}
                  onChange={(e) => setFormData({...formData, residenza_via_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Comune Residenza</Label>
                <Input 
                  value={formData.residenza_comune_sub}
                  onChange={(e) => setFormData({...formData, residenza_comune_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">CAP</Label>
                <Input 
                  value={formData.residenza_cap_sub}
                  onChange={(e) => setFormData({...formData, residenza_cap_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>

            {/* Riga 4: Sede Impresa */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Sede Impresa (Via/Piazza)</Label>
                <Input 
                  value={formData.sede_via_sub}
                  onChange={(e) => setFormData({...formData, sede_via_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Comune Sede</Label>
                <Input 
                  value={formData.sede_comune_sub}
                  onChange={(e) => setFormData({...formData, sede_comune_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">PEC</Label>
                <Input 
                  value={formData.pec_sub}
                  onChange={(e) => setFormData({...formData, pec_sub: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>
          </div>

          {/* SEZIONE B: CEDENTE */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#e8fbff] border-b border-[#1e293b] pb-2">
              B. Dati Cedente (Dante Causa)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Codice Fiscale Cedente *</Label>
                <div className="flex gap-2">
                  <Input 
                    value={formData.cf_cedente}
                    onChange={(e) => setFormData({...formData, cf_cedente: e.target.value.toUpperCase()})}
                    placeholder="Es. VRDLGI..."
                    className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                  />
                  <Button type="button" onClick={handleLookupCedente} variant="secondary">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Ragione Sociale Cedente</Label>
                <Input 
                  value={formData.ragione_sociale_ced}
                  onChange={(e) => setFormData({...formData, ragione_sociale_ced: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>
            
            {/* Dati SCIA Precedente */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="space-y-2">
                <Label className="text-[#e8fbff]">SCIA Precedente N. Prot.</Label>
                <Input 
                  value={formData.scia_precedente_protocollo}
                  onChange={(e) => setFormData({...formData, scia_precedente_protocollo: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Data Presentazione</Label>
                <Input 
                  type="date"
                  value={formData.scia_precedente_data}
                  onChange={(e) => setFormData({...formData, scia_precedente_data: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Comune Presentazione</Label>
                <Input 
                  value={formData.scia_precedente_comune}
                  onChange={(e) => setFormData({...formData, scia_precedente_comune: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>
          </div>

          {/* SEZIONE C: POSTEGGIO */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#e8fbff] border-b border-[#1e293b] pb-2">
              C. Dati Posteggio e Mercato
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Mercato</Label>
                <Select onValueChange={(val) => setFormData({...formData, mercato: val})}>
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue placeholder="Seleziona Mercato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="modena">Modena - Novi Sad</SelectItem>
                    <SelectItem value="altro">Altro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Numero Posteggio</Label>
                <Select onValueChange={(val) => setFormData({...formData, posteggio: val})}>
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue placeholder="Seleziona Posteggio" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_MERCATI.modena.posteggi.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Dettagli Posteggio */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="space-y-2">
                <Label className="text-[#e8fbff]">Dimensioni (MQ)</Label>
                <Input 
                  value={formData.dimensioni_mq}
                  onChange={(e) => setFormData({...formData, dimensioni_mq: e.target.value})}
                  placeholder="Es. 39"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Dimensioni Lineari (m x m)</Label>
                <Input 
                  value={formData.dimensioni_lineari}
                  onChange={(e) => setFormData({...formData, dimensioni_lineari: e.target.value})}
                  placeholder="Es. 6 x 6.5"
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Attrezzature</Label>
                <Select onValueChange={(val) => setFormData({...formData, attrezzature: val})}>
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banco">Solo Banco</SelectItem>
                    <SelectItem value="automezzo">Solo Automezzo</SelectItem>
                    <SelectItem value="banco_automezzo">Banco e Automezzo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                <Label className="text-[#e8fbff]">Merceologia</Label>
                <Select onValueChange={(val) => setFormData({...formData, merceologia: val})}>
                  <SelectTrigger className="bg-[#020817] border-[#1e293b] text-[#e8fbff]">
                    <SelectValue placeholder="Seleziona..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alimentare">Alimentare</SelectItem>
                    <SelectItem value="non_alimentare">Non Alimentare</SelectItem>
                    <SelectItem value="misto">Misto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SEZIONE D: ATTO */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-[#e8fbff] border-b border-[#1e293b] pb-2">
              D. Estremi Atto Notarile
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Notaio Rogante</Label>
                <Input 
                  value={formData.notaio}
                  onChange={(e) => setFormData({...formData, notaio: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">N. Repertorio</Label>
                <Input 
                  value={formData.repertorio}
                  onChange={(e) => setFormData({...formData, repertorio: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[#e8fbff]">Data Atto</Label>
                <Input 
                  type="date"
                  value={formData.data_atto}
                  onChange={(e) => setFormData({...formData, data_atto: e.target.value})}
                  className="bg-[#020817] border-[#1e293b] text-[#e8fbff]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="border-[#e8fbff]/20 text-[#e8fbff]">
              Annulla
            </Button>
            <Button type="submit" className="bg-[#00f0ff] text-black hover:bg-[#00f0ff]/90">
              Genera Pratica SCIA
            </Button>
          </div>

        </form>
      </CardContent>
    </Card>
  );
}
