import React from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import GestioneHubMapWrapper from '@/components/GestioneHubMapWrapper';

/**
 * MappaItaliaPage - Pagina Pubblica Mappa Italia
 * Gemello Digitale del Commercio Nazionale
 * 
 * v3.56.0 - Usa GestioneHubMapWrapper con vista HUB + Mercati integrata
 * Include toggle Mercati/HUB, filtri Regione/Provincia, Vista Italia
 */
export default function MappaItaliaPage() {
  const [, navigate] = useLocation();

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0b1220] flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#14b8a6] via-[#06b6d4] to-[#0891b2] text-white p-3 md:p-4 shadow-lg flex-shrink-0">
        <div className="w-full px-4 md:px-8 flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all duration-300 hover:scale-105 flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg md:text-xl font-bold">Mappa Italia</h1>
            <p className="text-xs text-white/70">Gemello Digitale del Commercio</p>
          </div>
        </div>
      </header>

      {/* Mappa Container - GestioneHubMapWrapper con toggle Mercati/HUB */}
      <div className="flex-1 overflow-visible pb-20">
        <GestioneHubMapWrapper />
      </div>
    </div>
  );
}
