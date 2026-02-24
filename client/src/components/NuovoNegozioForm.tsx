import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Store, Building2, MapPin, Phone, Mail, Tag, Loader2, CheckCircle2 } from 'lucide-react';
import { MIHUB_API_BASE_URL } from '@/config/api';
import { authenticatedFetch } from '@/hooks/useImpersonation';

const API_BASE_URL = MIHUB_API_BASE_URL;

interface HubLocation {
  id: number;
  name: string;
  city: string;
  address: string;
  lat?: string;
  lng?: string;
  center_lat?: string;
  center_lng?: string;
}

interface NuovoNegozioFormProps {
  onSuccess?: (data: { impresaId: number; shopId: number }) => void;
  onCancel?: () => void;
}

export default function NuovoNegozioForm({ onSuccess, onCancel }: NuovoNegozioFormProps) {
  // Stati form
  const [ragioneSociale, setRagioneSociale] = useState('');
  const [partitaIva, setPartitaIva] = useState('');
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [comune, setComune] = useState('');
  const [categoria, setCategoria] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [hubId, setHubId] = useState<string>('');
  
  // Stati UI
  const [hubs, setHubs] = useState<HubLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHubs, setIsLoadingHubs] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Carica lista HUB disponibili
  useEffect(() => {
    const loadHubs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/hub/locations`);
        const result = await response.json();
        if (result.success && result.data) {
          setHubs(result.data);
        }
      } catch (error) {
        console.error('Errore caricamento HUB:', error);
        toast.error('Errore nel caricamento degli HUB disponibili');
      } finally {
        setIsLoadingHubs(false);
      }
    };
    loadHubs();
  }, []);

  // Validazione campi
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!ragioneSociale.trim()) {
      newErrors.ragioneSociale = 'Ragione sociale obbligatoria';
    }

    if (!partitaIva.trim()) {
      newErrors.partitaIva = 'Partita IVA obbligatoria';
    } else if (partitaIva.length !== 11 || !/^\d+$/.test(partitaIva)) {
      newErrors.partitaIva = 'Partita IVA deve essere di 11 cifre';
    }

    if (!codiceFiscale.trim()) {
      newErrors.codiceFiscale = 'Codice fiscale obbligatorio';
    } else if (codiceFiscale.length !== 16 && codiceFiscale.length !== 11) {
      newErrors.codiceFiscale = 'Codice fiscale deve essere di 16 caratteri (o 11 per società)';
    }

    if (!comune.trim()) {
      newErrors.comune = 'Comune obbligatorio';
    }

    if (!hubId) {
      newErrors.hubId = 'Seleziona un HUB di riferimento';
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email non valida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Correggi gli errori nel form');
      return;
    }

    setIsLoading(true);

    try {
      // Recupera coordinate dell'HUB selezionato come default per il negozio
      const selectedHub = hubs.find(h => h.id === parseInt(hubId));
      const hubLat = selectedHub?.center_lat || selectedHub?.lat || null;
      const hubLng = selectedHub?.center_lng || selectedHub?.lng || null;

      const response = await authenticatedFetch(`${API_BASE_URL}/api/hub/shops/create-with-impresa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          denominazione: ragioneSociale.trim(),
          partitaIva: partitaIva.trim(),
          codiceFiscale: codiceFiscale.trim().toUpperCase(),
          comune: comune.trim(),
          categoria: categoria.trim() || null,
          telefono: telefono.trim() || null,
          email: email.trim() || null,
          hubId: parseInt(hubId),
          lat: hubLat,
          lng: hubLng,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Negozio creato con successo!', {
          description: `${ragioneSociale} è stato aggiunto all'HUB`,
          icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        });
        
        // Reset form
        setRagioneSociale('');
        setPartitaIva('');
        setCodiceFiscale('');
        setComune('');
        setCategoria('');
        setTelefono('');
        setEmail('');
        setHubId('');
        
        // Callback successo
        if (onSuccess) {
          onSuccess({ impresaId: result.impresaId, shopId: result.shopId });
        }
      } else {
        toast.error(result.error || 'Errore nella creazione del negozio');
      }
    } catch (error) {
      console.error('Errore creazione negozio:', error);
      toast.error('Errore di connessione al server');
    } finally {
      setIsLoading(false);
    }
  };

  // Categorie disponibili
  // N = Negozio (Commercio), S = Servizio
  const categorie = [
    // Negozi (N)
    'Alimentari',
    'Abbigliamento',
    'Calzature',
    'Casalinghi',
    'Fiori e Piante',
    'Frutta e Verdura',
    'Pesce',
    'Carne',
    'Formaggi e Salumi',
    'Prodotti Biologici',
    'Artigianato',
    'Farmacia',
    'Edicola',
    'Tabacchi',
    // Servizi (S)
    'Bar',
    'Ristorante',
    'Pizzeria',
    'Caffetteria',
    'Gelateria',
    'Parrucchiere',
    'Estetista',
    'Servizi',
    'Altro',
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Store className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">Nuovo Negozio</CardTitle>
            <CardDescription>
              Inserisci i dati per creare una nuova vetrina nell'HUB
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sezione Dati Impresa */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Dati Impresa
            </h3>

            {/* Ragione Sociale */}
            <div className="space-y-2">
              <Label htmlFor="ragioneSociale">
                Ragione Sociale <span className="text-red-500">*</span>
              </Label>
              <Input
                id="ragioneSociale"
                placeholder="Es: Alimentari Rossi S.r.l."
                value={ragioneSociale}
                onChange={(e) => setRagioneSociale(e.target.value)}
                className={errors.ragioneSociale ? 'border-red-500' : ''}
              />
              {errors.ragioneSociale && (
                <p className="text-xs text-red-500">{errors.ragioneSociale}</p>
              )}
            </div>

            {/* Partita IVA e Codice Fiscale */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partitaIva">
                  Partita IVA <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="partitaIva"
                  placeholder="12345678901"
                  value={partitaIva}
                  onChange={(e) => setPartitaIva(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  maxLength={11}
                  className={errors.partitaIva ? 'border-red-500' : ''}
                />
                {errors.partitaIva && (
                  <p className="text-xs text-red-500">{errors.partitaIva}</p>
                )}
                <p className="text-xs text-muted-foreground">{partitaIva.length}/11 cifre</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="codiceFiscale">
                  Codice Fiscale <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="codiceFiscale"
                  placeholder="RSSMRA80A01H501Z"
                  value={codiceFiscale}
                  onChange={(e) => setCodiceFiscale(e.target.value.toUpperCase().slice(0, 16))}
                  maxLength={16}
                  className={errors.codiceFiscale ? 'border-red-500' : ''}
                />
                {errors.codiceFiscale && (
                  <p className="text-xs text-red-500">{errors.codiceFiscale}</p>
                )}
                <p className="text-xs text-muted-foreground">{codiceFiscale.length}/16 caratteri</p>
              </div>
            </div>

            {/* Comune */}
            <div className="space-y-2">
              <Label htmlFor="comune">
                <MapPin className="h-4 w-4 inline mr-1" />
                Comune Sede Legale <span className="text-red-500">*</span>
              </Label>
              <Input
                id="comune"
                placeholder="Es: Grosseto"
                value={comune}
                onChange={(e) => setComune(e.target.value)}
                className={errors.comune ? 'border-red-500' : ''}
              />
              {errors.comune && (
                <p className="text-xs text-red-500">{errors.comune}</p>
              )}
            </div>
          </div>

          {/* Sezione HUB */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Posizione nell'HUB
            </h3>

            <div className="space-y-2">
              <Label htmlFor="hubId">
                HUB di Riferimento <span className="text-red-500">*</span>
              </Label>
              {isLoadingHubs ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Caricamento HUB...
                </div>
              ) : (
                <Select value={hubId} onValueChange={setHubId}>
                  <SelectTrigger className={errors.hubId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Seleziona un HUB" />
                  </SelectTrigger>
                  <SelectContent>
                    {hubs.map((hub) => (
                      <SelectItem key={hub.id} value={hub.id.toString()}>
                        {hub.name} - {hub.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {errors.hubId && (
                <p className="text-xs text-red-500">{errors.hubId}</p>
              )}
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label htmlFor="categoria">
                <Tag className="h-4 w-4 inline mr-1" />
                Categoria Merceologica
              </Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona categoria (opzionale)" />
                </SelectTrigger>
                <SelectContent>
                  {categorie.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sezione Contatti */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contatti (opzionali)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="telefono">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Telefono
                </Label>
                <Input
                  id="telefono"
                  type="tel"
                  placeholder="+39 333 1234567"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  <Mail className="h-4 w-4 inline mr-1" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="info@negozio.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Pulsanti */}
          <div className="flex gap-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1"
              >
                Annulla
              </Button>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creazione in corso...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Crea Negozio
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
