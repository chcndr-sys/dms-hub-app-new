import { Shield, ArrowLeft, Mail, FileText, Download, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';

export default function PrivacyPolicyPage() {
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
                <Shield className="h-6 w-6 text-teal-400" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">Informativa sulla Privacy</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Ai sensi del Regolamento (UE) 2016/679 (GDPR) e del D.Lgs. 196/2003
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none p-6 space-y-8">

            <section>
              <h2 className="text-xl font-semibold text-teal-400 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                1. Titolare del Trattamento
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Il Titolare del trattamento dei dati personali e' il Comune che utilizza
                la piattaforma DMS Hub per la gestione dei mercati ambulanti sul proprio territorio.
                Ogni Comune aderente agisce come Titolare autonomo per i dati relativi al proprio ambito territoriale.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-teal-400">2. Responsabile della Protezione dei Dati (DPO)</h2>
              <p className="text-muted-foreground leading-relaxed">
                Il DPO di ciascun Comune e' contattabile tramite i canali istituzionali del Comune stesso.
                Per questioni relative alla piattaforma DMS Hub:
              </p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 mt-2">
                <Mail className="h-4 w-4 text-teal-400" />
                <span className="text-sm">privacy@dms-hub.it</span>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-teal-400">3. Finalita' e Base Giuridica del Trattamento</h2>
              <div className="space-y-3 text-muted-foreground">
                <div className="p-3 rounded-lg bg-muted/30">
                  <strong className="text-foreground">a) Gestione mercati ambulanti</strong>
                  <p className="text-sm mt-1">Base giuridica: esecuzione di un compito di interesse pubblico (Art. 6.1.e GDPR)</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <strong className="text-foreground">b) Gestione concessioni e posteggi</strong>
                  <p className="text-sm mt-1">Base giuridica: obbligo legale (Art. 6.1.c GDPR) — D.Lgs. 114/1998</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <strong className="text-foreground">c) Pagamenti e contabilita' (PagoPA)</strong>
                  <p className="text-sm mt-1">Base giuridica: obbligo legale (Art. 6.1.c GDPR) — CAD, D.Lgs. 82/2005</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <strong className="text-foreground">d) Autenticazione SPID/CIE/CNS</strong>
                  <p className="text-sm mt-1">Base giuridica: obbligo legale (Art. 6.1.c GDPR) — CAD, DPCM 24/10/2014</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <strong className="text-foreground">e) Controlli e sanzioni</strong>
                  <p className="text-sm mt-1">Base giuridica: esecuzione di un compito di interesse pubblico (Art. 6.1.e GDPR)</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-teal-400">4. Categorie di Dati Trattati</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Dati identificativi: nome, cognome, codice fiscale, P.IVA</li>
                <li>Dati di contatto: email, telefono, indirizzo</li>
                <li>Dati economici: transazioni, saldi wallet, pagamenti PagoPA</li>
                <li>Dati di geolocalizzazione: posizione durante check-in ai mercati</li>
                <li>Dati di accesso: log di autenticazione, indirizzo IP, dispositivo</li>
                <li>Dati professionali: tipologia attivita', codice ATECO, autorizzazioni</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-teal-400">5. Periodo di Conservazione</h2>
              <div className="space-y-2 text-muted-foreground text-sm">
                <div className="flex justify-between p-2 rounded bg-muted/30">
                  <span>Dati anagrafici operatori</span>
                  <span className="text-teal-400">Durata concessione + 10 anni</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted/30">
                  <span>Transazioni finanziarie</span>
                  <span className="text-teal-400">10 anni (obbligo fiscale)</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted/30">
                  <span>Log di accesso</span>
                  <span className="text-teal-400">6 mesi (Provv. Garante 27/11/2008)</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted/30">
                  <span>Metriche API</span>
                  <span className="text-teal-400">90 giorni</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-muted/30">
                  <span>Dati di geolocalizzazione</span>
                  <span className="text-teal-400">24 ore (solo verifica presenza)</span>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-teal-400">6. Diritti dell'Interessato</h2>
              <p className="text-muted-foreground mb-3">
                Ai sensi degli articoli 15-22 del GDPR, l'interessato ha diritto a:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 flex items-start gap-2">
                  <Download className="h-4 w-4 text-teal-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-sm text-foreground">Accesso e Portabilita'</strong>
                    <p className="text-xs text-muted-foreground">Scaricare tutti i propri dati in formato leggibile</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 flex items-start gap-2">
                  <Trash2 className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="text-sm text-foreground">Cancellazione</strong>
                    <p className="text-xs text-muted-foreground">Richiedere la cancellazione dei dati non soggetti a obbligo di conservazione</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Per esercitare questi diritti, contattare il DPO del Comune di riferimento
                o scrivere a privacy@dms-hub.it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-teal-400">7. Trasferimento Dati</h2>
              <p className="text-muted-foreground leading-relaxed">
                I dati sono conservati su server nell'Unione Europea (Neon PostgreSQL, regione EU).
                Non vengono trasferiti a paesi terzi. I servizi di autenticazione (Firebase Auth)
                sono conformi alle clausole contrattuali standard UE.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-teal-400">8. Cookie</h2>
              <p className="text-muted-foreground leading-relaxed">
                La piattaforma utilizza esclusivamente cookie tecnici necessari al funzionamento
                del servizio (sessione di autenticazione). Non vengono utilizzati cookie di
                profilazione o marketing. Per maggiori dettagli, consultare il banner cookie
                presente al primo accesso.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-teal-400">9. Reclami</h2>
              <p className="text-muted-foreground leading-relaxed">
                L'interessato ha diritto di proporre reclamo al Garante per la Protezione
                dei Dati Personali (www.garanteprivacy.it) qualora ritenga che il trattamento
                dei propri dati violi il GDPR.
              </p>
            </section>

            <div className="text-xs text-muted-foreground border-t border-border pt-4">
              Ultimo aggiornamento: Febbraio 2026 — Versione 1.0
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
