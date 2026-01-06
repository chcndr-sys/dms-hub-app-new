/**
 * HubMapTestPage.tsx
 * 
 * Pagina di test per la visualizzazione degli HUB con negozi.
 * Accessibile da /hub-map-test
 * 
 * @author Manus AI
 * @date 06 Gennaio 2026
 */

import React from 'react';
import { Link } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import HubMapTest from '@/components/HubMapTest';

export default function HubMapTestPage() {
  return (
    <div className="min-h-screen bg-[#0b1220]">
      {/* Header */}
      <header className="bg-[#1a2332] border-b border-[#9C27B0]/30 px-4 py-3">
        <div className="container mx-auto flex items-center gap-4">
          <Link href="/dashboard-pa">
            <Button variant="ghost" size="sm" className="text-[#e8fbff] hover:bg-[#9C27B0]/20">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard PA
            </Button>
          </Link>
          <div className="h-6 w-px bg-[#9C27B0]/30" />
          <h1 className="text-xl font-bold text-[#e8fbff]">
            🧪 Test Mappa HUB
          </h1>
          <span className="text-xs text-[#e8fbff]/50 bg-[#9C27B0]/20 px-2 py-1 rounded">
            Sperimentale
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto py-6 px-4">
        <HubMapTest />
      </main>

      {/* Footer */}
      <footer className="bg-[#1a2332] border-t border-[#9C27B0]/30 px-4 py-3 mt-8">
        <div className="container mx-auto text-center text-xs text-[#e8fbff]/50">
          HubMapComponent Test - MIO HUB System
        </div>
      </footer>
    </div>
  );
}
