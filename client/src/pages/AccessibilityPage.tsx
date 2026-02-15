import { Accessibility, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export default function AccessibilityPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla home
        </Button>

        <Card className="border-teal-500/20">
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-teal-500/10">
                <Accessibility className="h-6 w-6 text-teal-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Dichiarazione di Accessibilita'</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Ai sensi della Legge 4/2004 (Legge Stanca) e delle Linee Guida AGID
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-8">

            <section>
              <h2 className="text-xl font-semibold text-teal-400 mb-3">Stato di Conformita'</h2>
              <p className="text-muted-foreground leading-relaxed">
                La piattaforma DMS Hub si impegna a garantire l'accessibilita' del proprio
                sito web in conformita' con la Direttiva UE 2016/2102 e la Legge 4/2004.
              </p>
              <div className="mt-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-yellow-300">
                  <strong>Stato attuale:</strong> Parzialmente conforme alle WCAG 2.1 livello AA.
                  Sono in corso interventi per raggiungere la piena conformita'.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-teal-400 mb-3">Contenuti non accessibili</h2>
              <p className="text-muted-foreground mb-3">
                I seguenti contenuti non sono ancora pienamente accessibili:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 text-sm">
                <li>Alcune mappe interattive potrebbero non essere completamente navigabili da tastiera</li>
                <li>Grafici e visualizzazioni dati potrebbero non avere alternative testuali complete</li>
                <li>Alcuni componenti di terze parti potrebbero non rispettare tutti i criteri WCAG 2.1 AA</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-teal-400 mb-3">Tecnologie utilizzate</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 text-sm">
                <li>HTML5 con struttura semantica</li>
                <li>CSS3 con Tailwind CSS per layout responsivo</li>
                <li>JavaScript/React con componenti Radix UI (ARIA-compliant)</li>
                <li>WAI-ARIA per attributi di accessibilita'</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-teal-400 mb-3">Feedback e segnalazioni</h2>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Se riscontri problemi di accessibilita' non elencati in questa dichiarazione,
                puoi segnalarli a:
              </p>
              <div className="mt-2 p-3 rounded-lg bg-muted/50 text-sm">
                <p><strong className="text-foreground">Email:</strong> <span className="text-teal-400">accessibilita@dms-hub.it</span></p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-teal-400 mb-3">Difensore Civico per il Digitale</h2>
              <p className="text-muted-foreground leading-relaxed text-sm">
                Nel caso in cui la risposta non sia soddisfacente, e' possibile contattare
                il Difensore civico per il digitale, istituito ai sensi dell'art. 17 comma 1-quater
                del CAD (D.Lgs. 82/2005), tramite il sito dell'AGID.
              </p>
            </section>

            <div className="text-xs text-muted-foreground border-t border-border pt-4">
              Dichiarazione redatta il 15 febbraio 2026 — Revisione prevista: agosto 2026
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
