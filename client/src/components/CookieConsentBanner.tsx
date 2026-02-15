import { useState, useEffect } from 'react';
import { Cookie, Shield, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const COOKIE_CONSENT_KEY = 'dms_cookie_consent';
const COOKIE_CONSENT_VERSION = '1.0';

interface ConsentState {
  accepted: boolean;
  version: string;
  timestamp: string;
}

export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored) {
      try {
        const consent: ConsentState = JSON.parse(stored);
        // Mostra di nuovo se la versione e' cambiata
        if (consent.version !== COOKIE_CONSENT_VERSION) {
          setVisible(true);
        }
      } catch {
        setVisible(true);
      }
    } else {
      setVisible(true);
    }
  }, []);

  const acceptCookies = () => {
    const consent: ConsentState = {
      accepted: true,
      version: COOKIE_CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consenso cookie"
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-card/95 backdrop-blur-sm border-t border-border p-4 md:p-6 shadow-2xl"
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="h-6 w-6 text-teal-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm text-foreground font-medium">
              Questo sito utilizza cookie tecnici
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Utilizziamo esclusivamente cookie tecnici necessari al funzionamento del servizio
              (sessione di autenticazione). Non utilizziamo cookie di profilazione o marketing.
              Per maggiori informazioni consulta la{' '}
              <a
                href="/privacy"
                className="text-teal-400 hover:text-teal-300 underline inline-flex items-center gap-1"
              >
                Privacy Policy
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            onClick={acceptCookies}
            className="bg-teal-600 hover:bg-teal-500 text-white"
            size="sm"
          >
            <Shield className="h-4 w-4 mr-1" />
            Accetto
          </Button>
        </div>
      </div>
    </div>
  );
}
