import { useState, useEffect, useRef } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { AlertCircle, ArrowLeft, Camera, CheckCircle2, Shield, Clock, Award, Send, Info, X } from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { useImpersonation } from '@/hooks/useImpersonation';
import { getCachedUser } from '@/api/authClient';

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
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'requesting' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { comuneId } = useImpersonation();
  
  // Rileva se è mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

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

  // GPS automatico all'apertura pagina - usa popup nativo del browser
  useEffect(() => {
    if (!location && gpsStatus === 'idle') {
      setGpsStatus('requesting');
      
      // Questo triggera il popup nativo del browser/iOS per chiedere permesso GPS
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          setGpsStatus('success');
          toast.success('📍 Posizione GPS acquisita');
        },
        (error) => {
          console.error('GPS error:', error);
          setGpsStatus('error');
          // Non mostrare toast di errore subito, l'utente potrebbe aver negato
          if (error.code === error.PERMISSION_DENIED) {
            toast.error('Permesso GPS negato. Abilita la localizzazione nelle impostazioni.');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            toast.error('Posizione non disponibile. Riprova.');
          } else if (error.code === error.TIMEOUT) {
            toast.error('Timeout acquisizione GPS. Riprova.');
          }
        },
        { 
          enableHighAccuracy: true, 
          timeout: 15000,
          maximumAge: 0 
        }
      );
    }
  }, []);

  // Funzione per ritentare acquisizione GPS
  const retryGPS = () => {
    setGpsStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGpsStatus('success');
        toast.success('📍 Posizione GPS acquisita');
      },
      (error) => {
        console.error('GPS error:', error);
        setGpsStatus('error');
        toast.error('Impossibile acquisire la posizione GPS');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Gestione foto
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newPhotos = Array.from(files).slice(0, 3 - photos.length);
    if (photos.length + newPhotos.length > 3) {
      toast.error('Massimo 3 foto consentite');
      return;
    }
    
    // Crea preview
    newPhotos.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotosPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotosPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Upload foto su S3
  const uploadPhotosToS3 = async (): Promise<string[]> => {
    if (photos.length === 0) return [];
    
    setUploadingPhotos(true);
    const uploadedUrls: string[] = [];
    
    try {
      for (const photo of photos) {
        const formData = new FormData();
        formData.append('file', photo);
        formData.append('folder', 'civic-reports');
        
        const response = await fetch(`${API_BASE_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        if (data.success && data.url) {
          uploadedUrls.push(data.url);
        }
      }
    } catch (error) {
      console.error('Errore upload foto:', error);
      toast.error('Errore durante il caricamento delle foto');
    }
    
    setUploadingPhotos(false);
    return uploadedUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category || !description) {
      toast.error('Compila tutti i campi obbligatori');
      return;
    }

    if (!location) {
      toast.error('Posizione GPS non disponibile. Clicca su "Riprova GPS".');
      return;
    }

    setLoading(true);

    try {
      // Upload foto prima
      const photoUrls = await uploadPhotosToS3();
      
      // comune_id: se l'utente è in modalità impersonificazione, usa quel comune_id.
      // Altrimenti NON inviare comune_id, così il backend fa auto-detect dalle coordinate GPS
      // tramite findComuneByCoords(lat, lng)
      const currentComuneId = comuneId ? parseInt(comuneId) : null;
      
      // Recupera user_id dall'utente loggato per il sistema TCC
      // Supporta sia login ARPA (miohub_user_info) che login email (user)
      let currentUserId = null;
      try {
        // Prima prova login ARPA
        const arpaUser = getCachedUser();
        if (arpaUser?.id) {
          currentUserId = arpaUser.id;
        } else {
          // Fallback a login email
          const emailUserStr = localStorage.getItem('user');
          if (emailUserStr) {
            const emailUser = JSON.parse(emailUserStr);
            currentUserId = emailUser?.id || null;
          }
        }
      } catch (e) {
        console.error('Errore recupero user_id:', e);
      }
      
      const payload = {
        type: category,
        description: description,
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        ...(currentComuneId ? { comune_id: currentComuneId } : {}),
        user_id: currentUserId,
        impresa_id: null,
        priority: 'NORMAL',
        photos: photoUrls.length > 0 ? JSON.stringify(photoUrls) : null
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
        toast.success(`Segnalazione inviata! +${tccReward} crediti alla risoluzione`);
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header con gradient - fullscreen */}
      <header className="bg-gradient-to-r from-orange-500 via-red-500 to-rose-600 text-white p-4 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Sensore Civico</h1>
                <p className="text-xs text-white/70">Segnala problemi urbani</p>
              </div>
            </div>
          </div>
          {/* Icona Info */}
          <button 
            onClick={() => setShowInfoDialog(true)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Form - fullscreen, no container su mobile */}
      <div className={`flex-1 overflow-y-auto ${isMobile ? 'px-0' : 'px-4 md:px-8 py-4'}`}>
        {/* Card principale - fullscreen su mobile */}
        <Card className={`border-0 shadow-xl overflow-hidden ${isMobile ? 'rounded-none border-0' : 'rounded-xl my-4'}`}>
          <div className="h-1 bg-gradient-to-r from-orange-500 via-red-500 to-rose-600"></div>
          <CardHeader className={`pb-2 ${isMobile ? 'px-4 pt-4' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Segnala un Problema</CardTitle>
                <CardDescription className="text-sm">
                  +{tccReward} eco-crediti alla risoluzione
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className={isMobile ? 'px-4 pb-4' : ''}>
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Categoria */}
              <div className="space-y-1">
                <Label htmlFor="category" className="text-sm font-semibold">Categoria *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="h-11 text-base">
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
              <div className="space-y-1">
                <Label htmlFor="description" className="text-sm font-semibold">Descrizione *</Label>
                <Textarea
                  id="description"
                  placeholder="Descrivi il problema in dettaglio..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="resize-none text-base"
                />
              </div>

              {/* GPS Status */}
              {gpsStatus === 'success' && location && (
                <div className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg border border-green-500/30">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">
                    📍 Posizione acquisita
                  </span>
                </div>
              )}
              {gpsStatus === 'requesting' && (
                <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                  <AlertCircle className="h-4 w-4 text-yellow-500 animate-pulse" />
                  <span className="text-sm text-yellow-600 font-medium">
                    ⏳ Acquisizione GPS in corso...
                  </span>
                </div>
              )}
              {gpsStatus === 'error' && (
                <div className="flex items-center justify-between gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/30">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600 font-medium">
                      GPS non disponibile
                    </span>
                  </div>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="outline"
                    onClick={retryGPS}
                    className="h-7 text-xs"
                  >
                    Riprova
                  </Button>
                </div>
              )}

              {/* Foto - Upload funzionante */}
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Foto (max 3)</Label>
                
                {/* Preview foto */}
                {photosPreviews.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {photosPreviews.map((preview, index) => (
                      <div key={index} className="relative flex-shrink-0">
                        <img 
                          src={preview} 
                          alt={`Foto ${index + 1}`}
                          className="w-16 h-16 object-cover rounded-lg border-2 border-primary/30"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-1 -right-1 p-0.5 bg-red-500 rounded-full text-white shadow-lg"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Pulsante aggiungi foto */}
                {photos.length < 3 && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="w-full h-10 text-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Aggiungi Foto ({photos.length}/3)
                    </Button>
                  </>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-3 pt-2">
                <Link href="/" className="flex-1">
                  <Button type="button" variant="outline" className="w-full h-11 text-base font-semibold">
                    Annulla
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  className="flex-1 h-11 text-base font-semibold bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 shadow-lg"
                  disabled={loading || uploadingPhotos || !location}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {loading || uploadingPhotos ? 'Invio...' : 'Invia'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Dialog Info - Istruzioni CON indicatori */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
                <Info className="h-5 w-5 text-white" />
              </div>
              Come funziona?
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
              <div>
                <p className="font-semibold">Seleziona la categoria</p>
                <p className="text-sm text-muted-foreground">Scegli il tipo di problema tra degrado, rifiuti, illuminazione, sicurezza, buche o altro.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
              <div>
                <p className="font-semibold">Descrivi il problema</p>
                <p className="text-sm text-muted-foreground">Fornisci una descrizione dettagliata per aiutare gli operatori a intervenire.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
              <div>
                <p className="font-semibold">Posizione GPS automatica</p>
                <p className="text-sm text-muted-foreground">La posizione viene acquisita automaticamente all'apertura della pagina.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
              <div>
                <p className="font-semibold">Aggiungi foto (opzionale)</p>
                <p className="text-sm text-muted-foreground">Puoi allegare fino a 3 foto per documentare meglio il problema.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">5</span>
              <div>
                <p className="font-semibold">Ricevi eco-crediti</p>
                <p className="text-sm text-muted-foreground">Quando il problema sarà risolto, riceverai +{tccReward} eco-crediti come premio.</p>
              </div>
            </div>

            {/* Indicatori informativi nel popup */}
            <div className="border-t pt-4 mt-4">
              <p className="font-semibold mb-3">Statistiche del servizio</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-green-500/10 rounded-lg">
                  <div className="w-8 h-8 mx-auto mb-1 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <Award className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-lg font-bold text-green-600">+{tccReward}</div>
                  <div className="text-xs text-muted-foreground">Crediti Premio</div>
                </div>
                <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                  <div className="w-8 h-8 mx-auto mb-1 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-lg font-bold text-blue-600">48h</div>
                  <div className="text-xs text-muted-foreground">Tempo Medio</div>
                </div>
                <div className="text-center p-3 bg-purple-500/10 rounded-lg">
                  <div className="w-8 h-8 mx-auto mb-1 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-lg font-bold text-purple-600">94%</div>
                  <div className="text-xs text-muted-foreground">Risolte</div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogClose asChild>
            <Button className="w-full h-12 bg-gradient-to-r from-blue-500 to-blue-600">
              Ho capito
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </div>
  );
}
