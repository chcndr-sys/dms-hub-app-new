import { useState, useEffect } from 'react';
import NuovoNegozioForm from '@/components/NuovoNegozioForm';
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
  Plus,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  
  // Stato per controllo permessi modifica
  // NOTA: Per ora sempre true - in futuro integrare con sistema auth DMS
  const [canEdit, setCanEdit] = useState(true);
  const [isAdmin, setIsAdmin] = useState(true);
  
  // TODO: Integrare con sistema autenticazione DMS quando disponibile
  // Per ora tutti possono vedere tab Nuovo Negozio e tasto Modifica
  // In futuro: verificare ruolo utente da API backend DMS
  useEffect(() => {
    // Placeholder per futura integrazione auth
    // Per ora sempre abilitato
    setCanEdit(true);
    setIsAdmin(true);
  }, [selectedImpresa]);
  
  // Estrai query param 'q' dall'URL
  const getQueryParam = (name: string) => {
    const search = window.location.search;
    const params = new URLSearchParams(search);
    return params.get(name) || '';
  };

  const [searchQuery, setSearchQuery] = useState(getQueryParam('q'));
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('lista');
  
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

  // Helper: verifica se le coordinate sono valide (non null/NaN, range Italia)
  const isValidCoord = (lat: any, lng: any): boolean => {
    if (lat == null || lng == null || lat === '' || lng === '') return false;
    const latNum = parseFloat(String(lat));
    const lngNum = parseFloat(String(lng));
    if (isNaN(latNum) || isNaN(lngNum)) return false;
    if (latNum < 35 || latNum > 48 || lngNum < 6 || lngNum > 19) return false;
    return true;
  };

  const handleNavigate = async (impresa: Impresa) => {
    try {
      // 1. Prima cerca se l'impresa ha un negozio HUB (tramite owner_id)
      const hubShopsResponse = await fetch(`${API_BASE_URL}/api/hub/shops`);
      const hubShopsResult = await hubShopsResponse.json();

      if (hubShopsResult.success && hubShopsResult.data) {
        // Trova negozio HUB dell'impresa (owner_id = impresa.id)
        const hubShop = hubShopsResult.data.find((shop: any) => shop.owner_id === impresa.id);

        if (hubShop && isValidCoord(hubShop.lat, hubShop.lng)) {
          // Negozio HUB trovato con coordinate valide
          const params = new URLSearchParams({
            destinationLat: String(parseFloat(hubShop.lat)),
            destinationLng: String(parseFloat(hubShop.lng)),
            destinationName: `${impresa.denominazione} - Negozio HUB`,
            marketName: 'Hub Centro Grosseto'
          });
          navigate(`/route?${params.toString()}`);
          return;
        }
      }

      // 2. Se non è un negozio HUB, cerca nei posteggi del mercato
      const response = await fetch(`${API_BASE_URL}/api/markets/1/stalls`);
      const result = await response.json();

      if (result.success && result.data) {
        // Trova posteggio dell'impresa
        const stall = result.data.find((s: any) => s.impresa_id === impresa.id);

        if (stall && isValidCoord(stall.latitude, stall.longitude)) {
          // Passa coordinate GPS + info negozio
          const params = new URLSearchParams({
            destinationLat: String(parseFloat(stall.latitude)),
            destinationLng: String(parseFloat(stall.longitude)),
            destinationName: `${impresa.denominazione} - Posteggio #${stall.number}`,
            marketName: 'Mercato Grosseto'
          });
          navigate(`/route?${params.toString()}`);
        } else if (impresa.indirizzo) {
          // Fallback: usa solo indirizzo
          navigate(`/route?destination=${encodeURIComponent(impresa.indirizzo)}`);
        } else {
          toast.error('Nessuna posizione disponibile per questa impresa');
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
          <div className="w-full px-2 sm:px-4 md:px-8 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/20"
                onClick={() => {
                  // Naviga esplicitamente alla lista vetrine invece di history.back()
                  // per evitare loop di navigazione
                  setSelectedImpresa(null);
                  navigate('/vetrine');
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 sm:h-6 sm:w-6" />
                <h1 className="text-base sm:text-lg font-bold">Vetrina Negozio</h1>
              </div>
            </div>
            {/* Pulsante Modifica - visibile solo per admin o impresa titolare */}
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/20"
                onClick={handleOpenEditModal}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Modifica
              </Button>
            )}
          </div>
        </header>

        <div className="w-full px-0 sm:px-4 md:px-8 py-2 sm:py-6 space-y-4 sm:space-y-6">
          {/* Hero Section con Immagine Principale */}
          {selectedImpresa.vetrina_immagine_principale ? (
            <div className="relative w-full h-72 md:h-96 rounded-none sm:rounded-2xl overflow-hidden shadow-none sm:shadow-2xl group">
              <img
                src={selectedImpresa.vetrina_immagine_principale}
                alt={selectedImpresa.denominazione}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              {/* Info overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h2 className="text-3xl md:text-4xl font-bold mb-2 drop-shadow-lg">
                  {selectedImpresa.denominazione}
                </h2>
                <div className="flex items-center gap-4">
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-white/30">
                    {selectedImpresa.settore || 'Commercio'}
                  </Badge>
                  <div className="flex items-center gap-1 bg-amber-500/90 backdrop-blur-sm px-2 py-1 rounded-full">
                    <Star className="h-4 w-4 fill-white text-white" />
                    <span className="font-semibold text-sm">{rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-48 rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <div className="text-center">
                <Store className="h-16 w-16 text-primary/40 mx-auto mb-2" />
                <h2 className="text-2xl font-bold text-foreground">{selectedImpresa.denominazione}</h2>
                <Badge className="mt-2">{selectedImpresa.settore || 'Commercio'}</Badge>
              </div>
            </div>
          )}

          {/* Info Negozio - Card principale */}
          <Card className="border-0 shadow-none sm:shadow-lg bg-card/80 backdrop-blur-sm rounded-none sm:rounded-xl mx-0 sm:mx-0">
            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Descrizione con stile quote */}
              {selectedImpresa.vetrina_descrizione && (
                <div className="relative">
                  <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary to-primary/30 rounded-full" />
                  <p className="text-lg text-foreground/80 italic pl-4">
                    "{selectedImpresa.vetrina_descrizione}"
                  </p>
                </div>
              )}

              {/* Certificazioni/Badge migliorati */}
              <div className="flex flex-wrap gap-2">
                {selectedImpresa.settore && (
                  <Badge variant="secondary" className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-700 border border-green-500/30 px-3 py-1">
                    <Leaf className="h-3.5 w-3.5 mr-1.5" />
                    {selectedImpresa.settore}
                  </Badge>
                )}
                <Badge variant="secondary" className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-700 border border-blue-500/30 px-3 py-1">
                  <Award className="h-3.5 w-3.5 mr-1.5" />
                  Verificato
                </Badge>
              </div>

              {/* Contatti con design migliorato */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedImpresa.indirizzo && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Indirizzo</p>
                      <p className="text-sm font-medium">{selectedImpresa.indirizzo}</p>
                      <p className="text-sm text-muted-foreground">{selectedImpresa.comune}</p>
                    </div>
                  </div>
                )}
                {selectedImpresa.telefono && (
                  <a href={`tel:${selectedImpresa.telefono}`} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
                    <div className="p-2 rounded-lg bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                      <Phone className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Telefono</p>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors">{selectedImpresa.telefono}</p>
                    </div>
                  </a>
                )}
                {selectedImpresa.email && (
                  <a href={`mailto:${selectedImpresa.email}`} className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group">
                    <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                      <Mail className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                      <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">{selectedImpresa.email}</p>
                    </div>
                  </a>
                )}
              </div>

              {/* Social Media - Design migliorato */}
              {(selectedImpresa.social_facebook || selectedImpresa.social_instagram || 
                selectedImpresa.social_website || selectedImpresa.social_whatsapp) && (
                <div className="pt-6">
                  <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">Seguici sui Social</h3>
                  <div className="flex flex-wrap gap-3">
                    {selectedImpresa.social_facebook && (
                      <a
                        href={selectedImpresa.social_facebook.startsWith('http') ? selectedImpresa.social_facebook : `https://facebook.com/${selectedImpresa.social_facebook}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg hover:scale-105"
                      >
                        <Facebook className="h-5 w-5" />
                        <span className="text-sm font-medium">Facebook</span>
                      </a>
                    )}
                    {selectedImpresa.social_instagram && (
                      <a
                        href={selectedImpresa.social_instagram.startsWith('@') 
                          ? `https://instagram.com/${selectedImpresa.social_instagram.slice(1)}`
                          : selectedImpresa.social_instagram.startsWith('http')
                            ? selectedImpresa.social_instagram
                            : `https://instagram.com/${selectedImpresa.social_instagram}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-purple-500 to-orange-400 text-white hover:from-pink-600 hover:via-purple-600 hover:to-orange-500 transition-all shadow-md hover:shadow-lg hover:scale-105"
                      >
                        <Instagram className="h-5 w-5" />
                        <span className="text-sm font-medium">Instagram</span>
                      </a>
                    )}
                    {selectedImpresa.social_website && (
                      <a
                        href={selectedImpresa.social_website.startsWith('http') ? selectedImpresa.social_website : `https://${selectedImpresa.social_website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 transition-all shadow-md hover:shadow-lg hover:scale-105"
                      >
                        <Globe className="h-5 w-5" />
                        <span className="text-sm font-medium">Sito Web</span>
                      </a>
                    )}
                    {selectedImpresa.social_whatsapp && (
                      <a
                        href={`https://wa.me/${selectedImpresa.social_whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-all shadow-md hover:shadow-lg hover:scale-105"
                      >
                        <MessageCircle className="h-5 w-5" />
                        <span className="text-sm font-medium">WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Azioni principali - Design migliorato */}
              <div className="grid grid-cols-2 gap-4 pt-6">
                {selectedImpresa.telefono && (
                  <Button 
                    variant="outline" 
                    size="lg"
                    className="h-14 rounded-xl border-2 hover:bg-green-50 hover:border-green-500 hover:text-green-700 transition-all group"
                    asChild
                  >
                    <a href={`tel:${selectedImpresa.telefono}`}>
                      <Phone className="h-5 w-5 mr-2 group-hover:animate-pulse" />
                      <span className="font-semibold">Chiama Ora</span>
                    </a>
                  </Button>
                )}
                <Button 
                  variant="default"
                  size="lg"
                  className="h-14 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all group"
                  onClick={() => handleNavigate(selectedImpresa)}
                >
                  <Navigation className="h-5 w-5 mr-2 group-hover:animate-bounce" />
                  <span className="font-semibold">Come Arrivare</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Gallery Immagini - Swipe orizzontale su mobile, griglia su desktop */}
          {selectedImpresa.vetrina_gallery && selectedImpresa.vetrina_gallery.length > 0 && (
            <Card className="border-0 shadow-none sm:shadow-lg bg-card/80 backdrop-blur-sm overflow-hidden rounded-none sm:rounded-xl">
              <CardHeader className="pb-2 px-4 sm:px-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Store className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl">Galleria Prodotti</CardTitle>
                    <CardDescription className="text-sm">Le nostre specialità</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4 px-0 sm:px-6">
                {/* Mobile: Swipe orizzontale fullscreen con snap obbligatorio */}
                <div 
                  className="sm:hidden overflow-x-scroll scrollbar-hide snap-x snap-mandatory"
                  style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
                >
                  <div className="flex">
                    {selectedImpresa.vetrina_gallery.map((imageUrl, index) => (
                      <div
                        key={index}
                        className="flex-shrink-0 w-full"
                        style={{ scrollSnapAlign: 'center', scrollSnapStop: 'always' }}
                      >
                        <img
                          src={imageUrl}
                          alt={`Prodotto ${index + 1}`}
                          className="w-full h-72 object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  {/* Indicatore pagine */}
                  <div className="flex justify-center gap-1.5 mt-3 pb-2">
                    {selectedImpresa.vetrina_gallery.map((_, index) => (
                      <div key={index} className="w-2 h-2 rounded-full bg-primary/30" />
                    ))}
                  </div>
                </div>
                {/* Desktop: Griglia classica */}
                <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedImpresa.vetrina_gallery.map((imageUrl, index) => (
                    <div
                      key={index}
                      className="group relative aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer"
                    >
                      <img
                        src={imageUrl}
                        alt={`Prodotto ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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
                          €{product.price.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
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

  // Callback quando viene creato un nuovo negozio
  const handleNuovoNegozioSuccess = async (data: { impresaId: number; shopId: number }) => {
    // Ricarica la lista imprese
    try {
      const response = await fetch(`${API_BASE_URL}/api/imprese`);
      const result = await response.json();
      if (result.success) {
        setImprese(result.data || []);
      }
    } catch (error) {
      console.error('Errore ricaricamento lista:', error);
    }
    // Torna alla lista
    setActiveTab('lista');
  };

  // Vista lista imprese
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Header con pulsante Nuovo Negozio */}
      <header className="bg-primary text-primary-foreground p-3 shadow-md flex-shrink-0">
        <div className="w-full px-2 sm:px-4 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 sm:h-6 sm:w-6" />
              <h1 className="text-base sm:text-lg font-bold">Vetrine Commercianti</h1>
            </div>
          </div>
          {/* Pulsante Nuovo Negozio nell'header */}
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/20"
              onClick={() => setActiveTab('nuovo')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuovo Negozio
            </Button>
          )}
        </div>
      </header>

      {/* Contenuto principale - pagina statica con scroll interno */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'lista' ? (
          <>
            {/* Barra ricerca fuori dal container */}
            <div className="px-4 md:px-8 py-4 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca negozio o categoria..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-card border-border"
                />
              </div>
            </div>

            {/* Lista Imprese scrollabile */}
            <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-4">
              <div className="space-y-3">
                {filteredImprese.map((impresa) => (
                  <Card
                    key={impresa.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => navigate(`/vetrine/${impresa.id}`)}
                  >
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center justify-between mb-1">
                        <CardTitle className="text-base">{impresa.denominazione}</CardTitle>
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="text-sm font-semibold">{(Number(impresa.rating) || 4.5).toFixed(1)}</span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {impresa.settore || 'Commercio'}
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
          </>
        ) : (
          /* Form Nuovo Negozio */
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4">
            <NuovoNegozioForm 
              onSuccess={handleNuovoNegozioSuccess}
              onCancel={() => setActiveTab('lista')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
