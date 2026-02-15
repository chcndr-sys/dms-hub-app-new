import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText, Download, ExternalLink, Activity,
  Database, Server, LayoutDashboard, Shield,
  CheckCircle, AlertCircle, Clock, Calendar, Target
} from 'lucide-react';

export function LegacyReportCards() {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#e8fbff] flex items-center gap-2">
            <FileText className="h-6 w-6 text-[#06b6d4]" />
            Documentazione Tecnica & Report
          </h2>
          <p className="text-[#e8fbff]/60 mt-1">
            Dossier di sistema, blueprint architetturale, stato del progetto e resoconto ecosistema.
          </p>
        </div>
      </div>

      {/* Main Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Card 1: DOSSIER TECNICO (in evidenza) */}
        <Card className="bg-[#1a2332] border-[#a855f7]/40 hover:border-[#a855f7]/70 transition-colors ring-1 ring-[#a855f7]/10">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#a855f7]" />
              Dossier Tecnico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#e8fbff]/70">
              Analisi completa: architettura, sicurezza, conformità AGID/EU, integrazioni PA e valutazione economica.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#e8fbff]/50">
              <CheckCircle className="h-3 w-3 text-[#a855f7]" />
              10 sezioni + 42 documenti PDF
            </div>
            <Button
              className="w-full bg-[#a855f7] hover:bg-[#a855f7]/80 text-white"
              onClick={() => window.open('/dossier/index.html', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Apri Dossier Interattivo
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: System Blueprint */}
        <Card className="bg-[#1a2332] border-[#06b6d4]/30 hover:border-[#06b6d4]/60 transition-colors">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <Database className="h-5 w-5 text-[#06b6d4]" />
              System Blueprint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#e8fbff]/70">
              Codice sorgente, schema DB, guida operativa CLAUDE.md e documentazione tecnica.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#e8fbff]/50">
              <Server className="h-3 w-3" />
              218K righe — 70 tabelle — 119 endpoint
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 bg-[#06b6d4] hover:bg-[#06b6d4]/80 text-white"
                onClick={() => window.open('https://github.com/Chcndr/dms-hub-app-new', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Repo GitHub
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-[#a855f7] text-[#a855f7] hover:bg-[#a855f7]/10"
                onClick={() => window.open('https://github.com/Chcndr/dms-hub-app-new/blob/master/CLAUDE.md', '_blank')}
              >
                <FileText className="h-4 w-4 mr-2" />
                CLAUDE.md
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Stato Progetto */}
        <Card className="bg-[#1a2332] border-[#06b6d4]/30 hover:border-[#06b6d4]/60 transition-colors">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#f59e0b]" />
              Stato Progetto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#e8fbff]/70">
              Documento completo con stato attuale, architettura, funzionalità operative e roadmap.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#e8fbff]/50">
              <Calendar className="h-3 w-3" />
              Aggiornato periodicamente
            </div>
            <Button
              className="w-full bg-[#06b6d4] hover:bg-[#06b6d4]/80 text-white"
              onClick={() => window.open('/STATO_PROGETTO_AGGIORNATO.md', '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              Visualizza Documento
            </Button>
          </CardContent>
        </Card>

        {/* Card 4: Resoconto Ecosistema */}
        <Card className="bg-[#1a2332] border-[#06b6d4]/30 hover:border-[#06b6d4]/60 transition-colors">
          <CardHeader>
            <CardTitle className="text-[#e8fbff] flex items-center gap-2">
              <LayoutDashboard className="h-5 w-5 text-[#10b981]" />
              Resoconto Ecosistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-[#e8fbff]/70">
              Resoconto originale completo dell'ecosistema DMS Hub con tutte le 8 applicazioni web.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#e8fbff]/50">
              <Calendar className="h-3 w-3" />
              Data: 9 Novembre 2025
            </div>
            <Button
              className="w-full bg-[#06b6d4] hover:bg-[#06b6d4]/80 text-white"
              onClick={() => window.open('/report/index.html', '_blank')}
            >
              <Download className="h-4 w-4 mr-2" />
              Visualizza Documento
            </Button>
          </CardContent>
        </Card>

      </div>

      {/* Secondary Section: Documentazione Tecnica */}
      <div className="space-y-4 pt-4">
        <h3 className="text-lg font-semibold text-[#e8fbff] flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#ef4444]" />
          Documentazione Tecnica
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { title: 'Executive Summary', desc: 'Panoramica generale ecosistema DMS Hub', icon: Target, color: 'text-[#ef4444]' },
            { title: 'Architettura Tecnica', desc: 'Stack, Database, API e Servizi', icon: Server, color: 'text-[#f59e0b]' },
            { title: 'Applicazioni Web', desc: 'Stato e features di ogni app', icon: LayoutDashboard, color: 'text-[#10b981]' },
            { title: 'Sistema Integrazioni', desc: 'LLM Council, GitHub, Zapier, Neon', icon: Activity, color: 'text-[#f59e0b]' },
            { title: 'Funzionalità Operative', desc: 'Stato attuale delle funzionalità', icon: CheckCircle, color: 'text-[#10b981]' },
            { title: 'TODO Prioritizzati', desc: 'Roadmap e prossimi passi', icon: AlertCircle, color: 'text-[#ef4444]' }
          ].map((item, idx) => (
            <Card key={idx} className="bg-[#0b1220] border-[#1e293b] hover:border-[#06b6d4]/30 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`p-2 rounded-md bg-[#1a2332] ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-[#e8fbff] font-medium text-sm">{item.title}</h4>
                  <p className="text-xs text-[#e8fbff]/50 mt-1">{item.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
