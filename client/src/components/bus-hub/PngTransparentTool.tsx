/**
 * PNG Transparent Tool - Rimozione sfondo immagini mercato
 * Converte immagini/PDF in PNG con sfondo trasparente usando filtri HSV
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Upload, 
  Download, 
  RotateCw, 
  Save, 
  ArrowRight, 
  Image as ImageIcon,
  FileImage,
  Palette
} from 'lucide-react';
import { DMSBUS, PngMeta } from './dmsBus';

// PDF.js per conversione PDF
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

interface PngTransparentToolProps {
  onComplete?: (blob: Blob, meta: PngMeta) => void;
  onNavigateToSlotEditor?: () => void;
}

// Funzione per convertire RGB in HSV
function rgb2hsv(R: number, G: number, B: number): { h: number; s: number; v: number } {
  const r = R / 255;
  const g = G / 255;
  const b = B / 255;
  const M = Math.max(r, g, b);
  const m = Math.min(r, g, b);
  const C = M - m;
  let H = 0;
  
  if (C !== 0) {
    if (M === r) H = ((g - b) / C) % 6;
    else if (M === g) H = (b - r) / C + 2;
    else H = (r - g) / C + 4;
    H *= 60;
    if (H < 0) H += 360;
  }
  
  const V = M;
  const S = M === 0 ? 0 : C / M;
  return { h: H, s: S, v: V };
}

export function PngTransparentTool({ onComplete, onNavigateToSlotEditor }: PngTransparentToolProps) {
  // Refs per canvas
  const srcCanvasRef = useRef<HTMLCanvasElement>(null);
  const dstCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [hueMin, setHueMin] = useState(70);
  const [hueMax, setHueMax] = useState(160);
  const [satMin, setSatMin] = useState(25);
  const [valMin, setValMin] = useState(25);
  const [keepDigits, setKeepDigits] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);

  // Logger
  const log = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : '📝';
    setLogs(prev => [...prev.slice(-9), `${prefix} ${message}`]);
    console.log(`[PngTool] ${prefix} ${message}`);
  }, []);

  // Carica PDF.js se non presente
  useEffect(() => {
    if (!window.pdfjsLib) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.2.67/pdf.min.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  // Disegna immagine sui canvas
  const draw = useCallback(() => {
    if (!image || !srcCanvasRef.current || !dstCanvasRef.current) return;

    const W = image.naturalWidth;
    const H = image.naturalHeight;
    const isRotated = rotationAngle === 90 || rotationAngle === 270;
    
    const srcCanvas = srcCanvasRef.current;
    const dstCanvas = dstCanvasRef.current;
    
    srcCanvas.width = isRotated ? H : W;
    srcCanvas.height = isRotated ? W : H;
    dstCanvas.width = isRotated ? H : W;
    dstCanvas.height = isRotated ? W : H;

    // Disegna originale
    const sctx = srcCanvas.getContext('2d')!;
    sctx.save();
    sctx.translate(srcCanvas.width / 2, srcCanvas.height / 2);
    sctx.rotate((rotationAngle * Math.PI) / 180);
    sctx.drawImage(image, -W / 2, -H / 2);
    sctx.restore();

    // Disegna con trasparenza
    const dctx = dstCanvas.getContext('2d')!;
    dctx.save();
    dctx.translate(dstCanvas.width / 2, dstCanvas.height / 2);
    dctx.rotate((rotationAngle * Math.PI) / 180);
    dctx.drawImage(image, -W / 2, -H / 2);
    dctx.restore();

    // Applica filtro HSV
    const imgData = dctx.getImageData(0, 0, dstCanvas.width, dstCanvas.height);
    const d = imgData.data;
    const HMIN = hueMin;
    const HMAX = hueMax;
    const SMIN = satMin / 100;
    const VMIN = valMin / 100;

    for (let i = 0; i < d.length; i += 4) {
      const hsv = rgb2hsv(d[i], d[i + 1], d[i + 2]);
      let keep = hsv.h >= HMIN && hsv.h <= HMAX && hsv.s >= SMIN && hsv.v >= VMIN;
      
      // Mantieni numeri scuri
      if (keepDigits) {
        const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        if (lum < 90) keep = true;
      }
      
      d[i + 3] = keep ? 255 : 0;
    }

    dctx.putImageData(imgData, 0, 0);
  }, [image, rotationAngle, hueMin, hueMax, satMin, valMin, keepDigits]);

  // Ridisegna quando cambiano i parametri
  useEffect(() => {
    draw();
  }, [draw]);

  // Gestione caricamento file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setFileName(file.name);
    log(`Caricamento file: ${file.name}`);

    try {
      if (file.type === 'application/pdf') {
        // Converti PDF in immagine
        log('Conversione PDF in immagine...');
        const buf = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        
        const img = new Image();
        img.onload = () => {
          setImage(img);
          log(`PDF caricato e convertito (${viewport.width}x${viewport.height})`, 'success');
          setIsProcessing(false);
        };
        img.src = canvas.toDataURL('image/png');
      } else {
        // Carica immagine direttamente
        const img = new Image();
        img.onload = () => {
          setImage(img);
          log(`Immagine caricata (${img.naturalWidth}x${img.naturalHeight})`, 'success');
          setIsProcessing(false);
        };
        img.src = URL.createObjectURL(file);
      }
    } catch (err) {
      log(`Errore caricamento: ${err}`, 'error');
      setIsProcessing(false);
    }
  };

  // Rotazione
  const handleRotate = () => {
    setRotationAngle((prev) => (prev + 90) % 360);
    log(`Rotazione: ${(rotationAngle + 90) % 360}°`);
  };

  // Download PNG
  const handleDownload = () => {
    if (!dstCanvasRef.current) return;
    log('Download PNG trasparente...');
    
    const a = document.createElement('a');
    a.href = dstCanvasRef.current.toDataURL('image/png');
    a.download = 'stalls_transparent.png';
    a.click();
    log('PNG scaricato: stalls_transparent.png', 'success');
  };

  // Salva nel Bus
  const handleSaveToBus = async () => {
    if (!dstCanvasRef.current) return;
    
    try {
      log('Salvataggio nel bus...');
      
      const blob = await new Promise<Blob>((resolve, reject) => {
        dstCanvasRef.current!.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Blob creation failed'))),
          'image/png'
        );
      });

      const meta: PngMeta = {
        w: dstCanvasRef.current.width,
        h: dstCanvasRef.current.height,
        rotation: rotationAngle,
      };

      await DMSBUS.savePngTransparent(blob, meta);
      log(`PNG salvato nel bus (${meta.w}x${meta.h}, rot:${meta.rotation}°)`, 'success');
      
      if (onComplete) {
        onComplete(blob, meta);
      }
    } catch (err) {
      log(`Errore salvataggio: ${err}`, 'error');
    }
  };

  // Invia a Slot Editor
  const handleSendToSlotEditor = async () => {
    if (!dstCanvasRef.current || !srcCanvasRef.current) return;

    try {
      log('Invio a Slot Editor v3...');

      // Salva PNG trasparente
      const blobTransparent = await new Promise<Blob>((resolve, reject) => {
        dstCanvasRef.current!.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Blob creation failed'))),
          'image/png'
        );
      });
      log(`Blob trasparente: ${(blobTransparent.size / 1024).toFixed(2)} KB`);
      await DMSBUS.putBlob('png_transparent', blobTransparent);

      // Salva PNG originale (con numeri)
      const blobOriginal = await new Promise<Blob>((resolve, reject) => {
        srcCanvasRef.current!.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Blob creation failed'))),
          'image/png'
        );
      });
      log(`Blob originale: ${(blobOriginal.size / 1024).toFixed(2)} KB`);
      await DMSBUS.savePngOriginal(blobOriginal);

      // Salva metadata
      const meta: PngMeta = {
        w: dstCanvasRef.current.width,
        h: dstCanvasRef.current.height,
        rotation: rotationAngle,
      };
      await DMSBUS.putJSON('png_meta', meta);

      log('PNG salvato nel bus (trasparente + originale)', 'success');

      if (onNavigateToSlotEditor) {
        onNavigateToSlotEditor();
      }
    } catch (err) {
      log(`Errore invio: ${err}`, 'error');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Sidebar Controlli */}
      <Card className="w-full lg:w-80 flex-shrink-0 bg-[#0f2330] border-[#14b8a6]/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-[#14b8a6] flex items-center gap-2">
            <Palette className="h-5 w-5" />
            PNG Transparent Tool
          </CardTitle>
          <p className="text-xs text-[#e8fbff]/60">
            Rimuovi lo sfondo e mantieni solo i posteggi verdi
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload File */}
          <div>
            <Label className="text-[#e8fbff]/80 text-sm">Carica Immagine o PDF</Label>
            <div className="mt-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full bg-[#1a4a5a] border-[#14b8a6]/30 text-[#e8fbff] hover:bg-[#14b8a6]/20"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
              >
                <Upload className="h-4 w-4 mr-2" />
                {fileName || 'Seleziona file...'}
              </Button>
            </div>
          </div>

          {/* Filtri HSV */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <Label className="text-[#e8fbff]/80">Hue Min/Max</Label>
                <span className="text-[#14b8a6]">{hueMin}–{hueMax}</span>
              </div>
              <Slider
                value={[hueMin]}
                onValueChange={([v]) => setHueMin(v)}
                min={0}
                max={360}
                step={1}
                className="mb-2"
              />
              <Slider
                value={[hueMax]}
                onValueChange={([v]) => setHueMax(v)}
                min={0}
                max={360}
                step={1}
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <Label className="text-[#e8fbff]/80">Saturation Min</Label>
                <span className="text-[#14b8a6]">{satMin}%</span>
              </div>
              <Slider
                value={[satMin]}
                onValueChange={([v]) => setSatMin(v)}
                min={0}
                max={100}
                step={1}
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <Label className="text-[#e8fbff]/80">Value Min</Label>
                <span className="text-[#14b8a6]">{valMin}%</span>
              </div>
              <Slider
                value={[valMin]}
                onValueChange={([v]) => setValMin(v)}
                min={0}
                max={100}
                step={1}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="keepDigits"
                checked={keepDigits}
                onCheckedChange={(checked) => setKeepDigits(checked as boolean)}
              />
              <Label htmlFor="keepDigits" className="text-[#e8fbff]/80 text-sm cursor-pointer">
                Mantieni numeri scuri
              </Label>
            </div>
          </div>

          {/* Azioni */}
          <div className="space-y-2 pt-2">
            <Button
              variant="outline"
              className="w-full bg-[#ff9800]/20 border-[#ff9800]/30 text-[#ff9800] hover:bg-[#ff9800]/30"
              onClick={handleRotate}
              disabled={!image}
            >
              <RotateCw className="h-4 w-4 mr-2" />
              Ruota 90°
            </Button>

            <Button
              variant="outline"
              className="w-full bg-[#14b8a6]/20 border-[#14b8a6]/30 text-[#14b8a6] hover:bg-[#14b8a6]/30"
              onClick={handleDownload}
              disabled={!image}
            >
              <Download className="h-4 w-4 mr-2" />
              Scarica PNG
            </Button>

            <Button
              variant="outline"
              className="w-full bg-[#10b981]/20 border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/30"
              onClick={handleSaveToBus}
              disabled={!image}
            >
              <Save className="h-4 w-4 mr-2" />
              Salva nel Bus
            </Button>

            <Button
              className="w-full bg-[#ff5722] hover:bg-[#e64a19] text-white"
              onClick={handleSendToSlotEditor}
              disabled={!image}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Vai a Slot Editor v3
            </Button>
          </div>

          {/* Log Console */}
          <div className="mt-4 p-2 bg-[#0b1220] rounded border border-[#14b8a6]/20 max-h-32 overflow-y-auto">
            <p className="text-xs text-[#14b8a6] font-mono mb-1">Console:</p>
            {logs.map((log, i) => (
              <p key={i} className="text-xs text-[#e8fbff]/60 font-mono">{log}</p>
            ))}
            {logs.length === 0 && (
              <p className="text-xs text-[#e8fbff]/40 font-mono">Nessun log...</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Area Canvas */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Canvas Originale */}
        <Card className="bg-[#0f2330] border-[#14b8a6]/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#14b8a6] text-sm flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Originale
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="bg-[#0b1220] rounded-lg border border-[#14b8a6]/20 aspect-square flex items-center justify-center overflow-hidden">
              <canvas
                ref={srcCanvasRef}
                className="max-w-full max-h-full object-contain"
                style={{ background: 'repeating-conic-gradient(#1a2332 0% 25%, #0b1220 0% 50%) 50% / 20px 20px' }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Canvas Risultato */}
        <Card className="bg-[#0f2330] border-[#14b8a6]/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-[#14b8a6] text-sm flex items-center gap-2">
              <FileImage className="h-4 w-4" />
              Risultato (Trasparenza Applicata)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="bg-[#0b1220] rounded-lg border border-[#14b8a6]/20 aspect-square flex items-center justify-center overflow-hidden">
              <canvas
                ref={dstCanvasRef}
                className="max-w-full max-h-full object-contain"
                style={{ background: 'repeating-conic-gradient(#1a2332 0% 25%, #0b1220 0% 50%) 50% / 20px 20px' }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PngTransparentTool;
