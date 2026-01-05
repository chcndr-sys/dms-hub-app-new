import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Store,
  ArrowLeft,
  Search,
  Star,
  MapPin,
  Phone,
  Mail,
  Leaf,
  Award,
  Facebook,
  Instagram,
  Globe,
  MessageCircle,
  Navigation,
  Pencil,
  Upload,
  X,
} from 'lucide-react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MIHUB_API_BASE_URL } from '@/config/api';

const API_BASE_URL = MIHUB_API_BASE_URL;

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
}

interface Impresa {
  id: number;
  denominazione: string;
  partita_iva?: string;
  codice_fiscale?: string;
  settore?: string;
  comune?: string;
  indirizzo?: string;
  telefono?: string;
  email?: string;
  pec?: string;
  rappresentante_legale?: string;
  // Campi vetrina (da aggiungere al database)
  vetrina_immagine_principale?: string;
  vetrina_gallery?: string[];
  vetrina_descrizione?: string;
  social_facebook?: string;
  social_instagram?: string;
  social_website?: string;
  social_whatsapp?: string;
  rating?: number;
  products?: Product[];
}

export default function VetrinePage() {
  const [, params] = useRoute('/vetrine/:id');
  const [location, navigate] = useLocation();
  const [imprese, setImprese] = useState<Impresa[]>([]);
  const [selectedImpresa, setSelectedImpresa] = useState<Impresa | null>(null);
  
  // Estrai query param 'q' dall'URL
  const getQueryParam = (name: string) => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    return params.get(name) || '';
  };

  const [searchQuery, setSearchQuery] = useState(getQueryParam('q'));
  const [loading, setLoading] = useState(true);
  
  // Stati modal modifica
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editDescrizione, setEditDescrizione] = useState('');
  const [editSocialFacebook, setEditSocialFacebook] = useState('');
  const [editSocialInstagram, setEditSocialInstagram] = useState('');
  const [editSocialWebsite, setEditSocialWebsite] = useState('');
  const [editSocialWhatsapp, setEditSocialWhatsapp] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Stati upload immagini
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        if (params?.id) {
          // Carica impresa singola
          const response = await fetch(`${API_BASE_URL}/api/imprese/${params.id}`);
          const result = await response.json();
          if (result.success && result.data) {
            setSelectedImpresa(result.data);
          } else {
            toast.error('Impresa non trovata');
            navigate('/vetrine');
          }
        } else {
          // Carica lista imprese
          const response = await fetch(`${API_BASE_URL}/api/imprese`);
          const result = await response.json();
          if (result.success) {
            const data = result.data || [];
            setImprese(data);
            
            // Se c'è una query 'q' e troviamo una corrispondenza esatta o unica, selezionala
            const query = getQueryParam('q');
            if (query) {
              const matches = data.filter((i: Impresa) => 
                i.denominazione.toLowerCase().includes(query.toLowerCase())
              );
              // Se c'è esattamente un risultato, apri direttamente la vetrina
              if (matches.length === 1) {
                setSelectedImpresa(matches[0]);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Errore nel caricamento dei dati');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params?.id]);

  // Reset stati form quando cambia l'impresa selezionata
  useEffect(() => {
    if (selectedImpresa) {
      setEditDescrizione(selectedImpresa.vetrina_descrizione || '');
      setEditSocialFacebook(selectedImpresa.social_facebook || '');
      setEditSocialInstagram(selectedImpresa.social_instagram || '');
      setEditSocialWebsite(selectedImpresa.social_website || '');
      setEditSocialWhatsapp(selectedImpresa.social_whatsapp || '');
    } else {
      // Reset a valori vuoti quando non c'è impresa selezionata
      setEditDescrizione('');
      setEditSocialFacebook('');
      setEditSocialInstagram('');
      setEditSocialWebsite('');
      setEditSocialWhatsapp('');
    }
  }, [selectedImpresa?.id]);

  const filteredImprese = imprese.filter(
    (impresa) =>
      impresa.denominazione.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (impresa.settore && impresa.settore.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleBookProduct = (product: Product) => {
    toast.success(`Prodotto "${product.name}" prenotato! Ritira in negozio.`);
  };

  const handleNavigate = async (impresa: Impresa) => {
    try {
      // Carica coordinate posteggio dall'API
      const response = await fetch(`${API_BASE_URL}/api/markets/1/stalls`);
      const result = await response.json();
      
      if (result.success && result.data) {
        // Trova posteggio dell'impresa
        const stall = result.data.find((s: any) => s.impresa_id === impresa.id);
        
        if (stall && stall.latitude && stall.longitude) {
          // Passa coordinate GPS + info negozio
          const params = new URLSearchParams({
            destinationLat: stall.latitude.toString(),
            destinationLng: stall.longitude.toString(),
            destinationName: `${impresa.denominazione} - Posteggio #${stall.number}`,
            marketName: 'Mercato Grosseto'
          });
          navigate(`/route?${params.toString()}`);
        } else {
          // Fallback: usa solo indirizzo
          navigate(`/route?destination=${encodeURIComponent(impresa.indirizzo || '')}`);
        }
      }
    } catch (error) {
      console.error('Errore caricamento coordinate:', error);
      toast.error('Errore nel calcolo del percorso');
    }
  };

  const handleOpenEditModal = () => {
    if (!selectedImpresa) return;
    
    // Popola i campi del form con i dati attuali
    setEditDescrizione(selectedImpresa.vetrina_descrizione || '');
    setEditSocialFacebook(selectedImpresa.social_facebook || '');
    setEditSocialInstagram(selectedImpresa.social_instagram || '');
    setEditSocialWebsite(selectedImpresa.social_website || '');
    setEditSocialWhatsapp(selectedImpresa.social_whatsapp || '');
    setIsEditModalOpen(true);
  };

  const handleSaveVetrina = async () => {
    if (!selectedImpresa) return;
    
    setIsSaving(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/imprese/${selectedImpresa.id}/vetrina`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vetrina_descrizione: editDescrizione,
          social_facebook: editSocialFacebook,
          social_instagram: editSocialInstagram,
          social_website: editSocialWebsite,
          social_whatsapp: editSocialWhatsapp,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        // Aggiorna i dati locali
        setSelectedImpresa({
          ...selectedImpresa,
          vetrina_descrizione: editDescrizione,
          social_facebook: editSocialFacebook,
          social_instagram: editSocialInstagram,
          social_website: editSocialWebsite,
          social_whatsapp: editSocialWhatsapp,
        });
        
        toast.success('Vetrina aggiornata con successo!');
        setIsEditModalOpen(false);
      } else {
        toast.error(result.error || 'Errore nell\'aggiornamento');
      }
    } catch (error) {
      console.error('Error saving vetrina:', error);
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSaving(false);
    }
  };

  // Funzione per gestire l'upload dell'immagine
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'principale' | 'gallery') => {
    alert('Upload iniziato! File: ' + (event.target.files?.[0]?.name || 'nessuno'));
    console.log('handleImageUpload called', { type, files: event.target.files });
    const file = event.target.files?.[0];
    if (!file) {
      alert('Nessun file selezionato');
      console.log('No file selected');
      return;
    }
    if (!selectedImpresa) {
      alert('Nessuna impresa selezionata');
      console.log('No selectedImpresa');
      return;
    }
    
    alert('File valido: ' + file.name + ' - Dimensione: ' + file.size + ' bytes');
    toast.info(`Caricamento ${file.name} in corso...`);

    // Verifica tipo file
    if (!file.type.startsWith('image/')) {
      toast.error('Seleziona un file immagine valido');
      return;
    }

    // Verifica dimensione (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'immagine deve essere inferiore a 5MB');
      return;
    }

    setIsUploadingImage(true);

    try {
      // Converti in base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        
        // Mostra preview
        setPreviewImage(base64Data);

        // Invia al backend
        console.log('Sending to backend:', { type, fileName: file.name, dataLength: base64Data.length });
        try {
          const response = await fetch(`${API_BASE_URL}/api/imprese/${selectedImpresa.id}/vetrina/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: type,
              imageData: base64Data,
              fileName: file.name
            }),
          });
          
          console.log('Response status:', response.status);
          const result = await response.json();
          console.log('Response result:', result);

        if (result.success) {
          // Aggiorna i dati locali
          if (type === 'principale') {
            setSelectedImpresa({
              ...selectedImpresa,
              vetrina_immagine_principale: result.data.url
            });
          } else {
            const currentGallery = selectedImpresa.vetrina_gallery || [];
            setSelectedImpresa({
              ...selectedImpresa,
              vetrina_gallery: [...currentGallery, result.data.url]
            });
          }
          toast.success('Immagine caricata con successo!');
          setPreviewImage(null);
        } else {
          toast.error(result.error || 'Errore nel caricamento');
        }
        } catch (fetchError) {
          console.error('Fetch error:', fetchError);
          toast.error('Errore di connessione al server');
        }
        setIsUploadingImage(false);
      };

      reader.onerror = () => {
        toast.error('Errore nella lettura del file');
        setIsUploadingImage(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Errore nel caricamento dell\'immagine');
      setIsUploadingImage(false);
    }
  };

  // Funzione per rimuovere immagine dalla gallery
  const handleRemoveGalleryImage = async (index: number) => {
    if (!selectedImpresa) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/imprese/${selectedImpresa.id}/vetrina/gallery/${index}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        const newGallery = [...(selectedImpresa.vetrina_gallery || [])];
        newGallery.splice(index, 1);
        setSelectedImpresa({
          ...selectedImpresa,
          vetrina_gallery: newGallery
        });
        toast.success('Immagine rimossa');
      } else {
        toast.error(result.error || 'Errore nella rimozione');
      }
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Errore nella rimozione dell\'immagine');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento vetrina...</p>
        </div>
      </div>
    );
  }

  // Vista dettaglio impresa
  if (selectedImpresa) {
    const rating = Number(selectedImpresa.rating) || 4.5; // Default rating se non presente

    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-primary text-primary-foreground p-3 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Store className="h-6 w-6" />
                <h1 className="text-lg font-bold">Vetrina Negozio</h1>
              </div>
            </div>
            {/* Pulsante Modifica (visibile solo al proprietario - per ora sempre visibile) */}
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/20"
              onClick={handleOpenEditModal}
            >
              <Pencil className="h-4 w-4 mr-2" />
              Modifica
            </Button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
          {/* Immagine Principale */}
          {selectedImpresa.vetrina_immagine_principale && (
            <div className="w-full h-64 rounded-lg overflow-hidden shadow-lg">
              <img
                src={selectedImpresa.vetrina_immagine_principale}
                alt={selectedImpresa.denominazione}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Info Negozio */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedImpresa.denominazione}</CardTitle>
                  <CardDescription className="mt-1">{selectedImpresa.settore || 'Commercio'}</CardDescription>
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="font-semibold">{rating.toFixed(1)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Descrizione */}
              {selectedImpresa.vetrina_descrizione && (
                <p className="text-muted-foreground">{selectedImpresa.vetrina_descrizione}</p>
              )}

              {/* Certificazioni/Badge */}
              {selectedImpresa.settore && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <Leaf className="h-3 w-3 mr-1" />
                    {selectedImpresa.settore}
                  </Badge>
                </div>
              )}

              {/* Contatti */}
              <div className="space-y-2 text-sm">
                {selectedImpresa.indirizzo && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{selectedImpresa.indirizzo}, {selectedImpresa.comune}</span>
                  </div>
                )}
                {selectedImpresa.telefono && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${selectedImpresa.telefono}`} className="hover:text-primary">
                      {selectedImpresa.telefono}
                    </a>
                  </div>
                )}
                {selectedImpresa.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${selectedImpresa.email}`} className="hover:text-primary">
                      {selectedImpresa.email}
                    </a>
                  </div>
                )}
              </div>

              {/* Social Media */}
              {(selectedImpresa.social_facebook || selectedImpresa.social_instagram || 
                selectedImpresa.social_website || selectedImpresa.social_whatsapp) && (
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-semibold mb-3">Seguici su:</h3>
                  <div className="flex gap-3">
                    {selectedImpresa.social_facebook && (
                      <a
                        href={selectedImpresa.social_facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                      >
                        <Facebook className="h-5 w-5" />
                      </a>
                    )}
                    {selectedImpresa.social_instagram && (
                      <a
                        href={selectedImpresa.social_instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full bg-pink-100 text-pink-600 hover:bg-pink-200 transition-colors"
                      >
                        <Instagram className="h-5 w-5" />
                      </a>
                    )}
                    {selectedImpresa.social_website && (
                      <a
                        href={selectedImpresa.social_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        <Globe className="h-5 w-5" />
                      </a>
                    )}
                    {selectedImpresa.social_whatsapp && (
                      <a
                        href={`https://wa.me/${selectedImpresa.social_whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                      >
                        <MessageCircle className="h-5 w-5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Azioni */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                {selectedImpresa.telefono && (
                  <Button variant="outline" asChild>
                    <a href={`tel:${selectedImpresa.telefono}`}>
                      <Phone className="h-4 w-4 mr-2" />
                      Chiama
                    </a>
                  </Button>
                )}
                <Button 
                  variant="outline"
                  onClick={() => handleNavigate(selectedImpresa)}
                >
                  <Navigation className="h-4 w-4 mr-2" />
                  Come Arrivare
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Gallery Immagini */}
          {selectedImpresa.vetrina_gallery && selectedImpresa.vetrina_gallery.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Galleria Prodotti</CardTitle>
                <CardDescription>Le nostre specialità</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedImpresa.vetrina_gallery.map((imageUrl, index) => (
                    <div
                      key={index}
                      className="aspect-square rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <img
                        src={imageUrl}
                        alt={`Prodotto ${index + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Prodotti (se presenti) */}
          {selectedImpresa.products && selectedImpresa.products.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Prodotti</CardTitle>
                <CardDescription>Catalogo disponibile</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedImpresa.products.map((product) => (
                    <div
                      key={product.id}
                      className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold">{product.name}</h3>
                        <span className="text-lg font-bold text-primary">
                          €{product.price.toFixed(2)}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleBookProduct(product)}
                      >
                        Prenota
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Modal Modifica Vetrina - Componente separato per evitare pre-rendering */}
        {isEditModalOpen ? (
        <Dialog open={true} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>✏️ Modifica Vetrina</DialogTitle>
              <DialogDescription>
                Aggiorna le informazioni della tua vetrina digitale
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Descrizione */}
              <div className="space-y-2">
                <Label htmlFor="descrizione">Descrizione</Label>
                <Textarea
                  id="descrizione"
                  placeholder="Descrivi la tua attività..."
                  value={editDescrizione}
                  onChange={(e) => setEditDescrizione(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {editDescrizione.length} caratteri
                </p>
              </div>

              {/* Social Media */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Social Media</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="facebook">
                    <Facebook className="h-4 w-4 inline mr-2" />
                    Facebook
                  </Label>
                  <Input
                    id="facebook"
                    type="url"
                    placeholder="https://facebook.com/tuapagina"
                    value={editSocialFacebook}
                    onChange={(e) => setEditSocialFacebook(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instagram">
                    <Instagram className="h-4 w-4 inline mr-2" />
                    Instagram
                  </Label>
                  <Input
                    id="instagram"
                    placeholder="@tuoaccount o URL completo"
                    value={editSocialInstagram}
                    onChange={(e) => setEditSocialInstagram(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">
                    <Globe className="h-4 w-4 inline mr-2" />
                    Sito Web
                  </Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://tuosito.it"
                    value={editSocialWebsite}
                    onChange={(e) => setEditSocialWebsite(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="whatsapp">
                    <MessageCircle className="h-4 w-4 inline mr-2" />
                    WhatsApp
                  </Label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    placeholder="+39 333 1234567"
                    value={editSocialWhatsapp}
                    onChange={(e) => setEditSocialWhatsapp(e.target.value)}
                  />
                </div>
              </div>

              {/* Upload Immagini */}
              <div className="space-y-4">
                <Label className="text-base font-semibold">📸 Immagini Vetrina</Label>
                
                {/* Immagine Principale */}
                <div className="space-y-2">
                  <Label className="text-sm">Immagine Principale (copertina)</Label>
                  <div className="flex items-center gap-4">
                    {selectedImpresa?.vetrina_immagine_principale ? (
                      <div className="relative w-32 h-20 rounded-lg overflow-hidden border">
                        <img 
                          src={selectedImpresa.vetrina_immagine_principale} 
                          alt="Copertina" 
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            setSelectedImpresa({
                              ...selectedImpresa,
                              vetrina_immagine_principale: undefined
                            });
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-20 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/30">
                        <span className="text-xs text-muted-foreground">Nessuna</span>
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'principale')}
                        disabled={isUploadingImage}
                        className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Max 5MB - JPG, PNG, GIF</p>
                    </div>
                  </div>
                </div>

                {/* Gallery */}
                <div className="space-y-2">
                  <Label className="text-sm">Galleria Prodotti (max 6 immagini)</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(selectedImpresa?.vetrina_gallery || []).map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                        <img src={img} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleRemoveGalleryImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {(selectedImpresa?.vetrina_gallery || []).length < 6 && (
                      <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors">
                        <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Aggiungi</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'gallery')}
                          disabled={isUploadingImage}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {isUploadingImage && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Caricamento in corso...
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSaving}
              >
                Annulla
              </Button>
              <Button
                onClick={handleSaveVetrina}
                disabled={isSaving}
              >
                {isSaving ? 'Salvataggio...' : '💾 Salva Modifiche'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        ) : null}
      </div>
    );
  }

  // Vista lista imprese
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6" />
            <h1 className="text-lg font-bold">Vetrine Commercianti</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
        {/* Ricerca */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca negozio o categoria..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista Imprese */}
        <div className="space-y-4">
          {filteredImprese.map((impresa) => (
            <Card
              key={impresa.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/vetrine/${impresa.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{impresa.denominazione}</CardTitle>
                    <CardDescription>{impresa.settore || 'Commercio'}</CardDescription>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm font-semibold">{(Number(impresa.rating) || 4.5).toFixed(1)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  {impresa.vetrina_descrizione || `${impresa.denominazione} - ${impresa.comune}`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {impresa.settore && (
                    <Badge variant="secondary" className="text-xs">
                      {impresa.settore}
                    </Badge>
                  )}
                  {impresa.comune && (
                    <Badge variant="outline" className="text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      {impresa.comune}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredImprese.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Store className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nessun negozio trovato</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
