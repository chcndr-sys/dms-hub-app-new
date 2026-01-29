import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, ArrowLeft, Camera, MapPin, CheckCircle2, Shield, Clock, Award, Send } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { useImpersonation } from '@/hooks/useImpersonation';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.mio-hub.me';

const categories = [
  { value: 'Degrado', icon: '🏚️' },
  { value: 'Rifiuti', icon: '🗑️' },
  { value: 'Illuminazione', icon: '💡' },
  { value: 'Sicurezza', icon: '🔒' },
  { value: 'Buche', icon: '🕳️' },
  { value: 'Microcriminalità', icon: '⚠️' },
  { value: 'Altro', icon: '📝' },
];

export default function CivicPage() {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [tccReward, setTccReward] = useState(20);
  
  const { comuneId, isImpersonating } = useImpersonation();

  // Carica config TCC per il comune
  useEffect(() => {
    const loadConfig = async () => {
      const currentComuneId = comuneId ? parseInt(comuneId) : 1;
      try {
        const response = await fetch(`${API_BASE_URL}/api/civic-reports/config?comune_id=${currentComuneId}`);
        const data = await response.json();
        if (data.success && data.data) {
          setTccReward(data.data.tcc_reward_default || 20);
        }
      } catch (error) {
        console.error('Errore caricamento config TCC:', error);
      }
    };
    loadConfig();
  }, [comuneId]);

  const handleGetLocation = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setLoading(false);
        toast.success('Posizione acquisita!');
      },
      (error) => {
        setLoading(false);
        toast.error('Impossibile ottenere la posizione');
        console.error(error);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category || !description) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    if (!location) {
      toast.error('Acquisisci la posizione prima di inviare');
      return;
    }

    setLoading(true);

    try {
      const currentComuneId = comuneId ? parseInt(comuneId) : 1;
      
      const payload = {
        type: category,
        description: description,
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        comune_id: currentComuneId,
        user_id: null,
        impresa_id: null,
        priority: 'NORMAL'
      };

      const response = await fetch(`${API_BASE_URL}/api/civic-reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setLoading(false);
        setSubmitted(true);
        toast.success(`Segnalazione inviata con successo! +${tccReward} crediti alla risoluzione`);
      } else {
        throw new Error(data.error || 'Errore invio segnalazione');
      }
    } catch (error) {
      setLoading(false);
      console.error('Errore invio segnalazione:', error);
      toast.error('Errore durante l\'invio della segnalazione');
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-0 shadow-2xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold">Segnalazione Inviata!</h2>
            <p className="text-muted-foreground text-lg">
              Grazie per il tuo contributo. Riceverai aggiornamenti sullo stato della segnalazione e
              <span className="font-bold text-green-600"> +{tccReward} eco-crediti</span> quando sarà risolta.
            </p>
            <Link href="/">
              <Button className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-600 shadow-lg">
                Torna alla Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header con gradient */}
      <header className="bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 text-white p-4 shadow-lg">
        <div className="w-full px-4 md:px-8 flex items-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-105"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Sensore Civico</h1>
              <p className="text-xs text-white/70">Segnala problemi urbani</p>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full px-4 md:px-8 py-6 space-y-6">
        {/* Form Card */}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-orange-500 via-red-500 to-rose-600"></div>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Segnala un Problema Urbano</CardTitle>
                <CardDescription>
                  Aiutaci a migliorare la città. Riceverai +{tccReward} eco-crediti quando il problema sarà risolto.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Categoria */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-base font-semibold">Categoria *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="h-12 text-base">
                    <SelectValue placeholder="Seleziona categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value} className="text-base">
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.value}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Descrizione */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-base font-semibold">Descrizione *</Label>
                <Textarea
                  id="description"
                  placeholder="Descrivi il problema in dettaglio..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="resize-none text-base"
                />
              </div>

              {/* Posizione */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Posizione *</Label>
                <Button
                  type="button"
                  variant={location ? "default" : "outline"}
                  className={`w-full h-14 text-base ${location ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' : ''}`}
                  onClick={handleGetLocation}
                  disabled={loading}
                >
                  <MapPin className="h-5 w-5 mr-2" />
                  {location ? '✓ Posizione Acquisita' : 'Acquisisci Posizione GPS'}
                </Button>
                {location && (
                  <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg">
                    📍 Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                  </p>
                )}
              </div>

              {/* Foto */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Foto (max 3)</Label>
                <Button type="button" variant="outline" className="w-full h-14 text-base" disabled>
                  <Camera className="h-5 w-5 mr-2" />
                  Aggiungi Foto (Coming Soon)
                </Button>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4">
                <Link href="/" className="flex-1">
                  <Button type="button" variant="outline" className="w-full h-14 text-base font-semibold">
                    Annulla
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  className="flex-1 h-14 text-base font-semibold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-300"
                  disabled={loading}
                >
                  <Send className="h-5 w-5 mr-2" />
                  {loading ? 'Invio...' : 'Invia Segnalazione'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Box - Come funziona */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-lg mb-3">Come funziona?</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                    <span>Seleziona la categoria del problema</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                    <span>Descrivi la situazione in dettaglio</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                    <span>Acquisisci la posizione GPS</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                    <span>Ricevi notifiche sullo stato</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-green-500/10 to-green-600/5">
            <CardContent className="pt-4 pb-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow">
                <Award className="h-5 w-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-green-600">+{tccReward}</div>
              <div className="text-xs text-muted-foreground">Crediti Premio</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-blue-500/10 to-blue-600/5">
            <CardContent className="pt-4 pb-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-blue-600">48h</div>
              <div className="text-xs text-muted-foreground">Tempo Medio</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-purple-500/10 to-purple-600/5">
            <CardContent className="pt-4 pb-4 text-center">
              <div className="w-10 h-10 mx-auto mb-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="text-2xl font-bold text-purple-600">94%</div>
              <div className="text-xs text-muted-foreground">Risolte</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
