import { Shield, Accessibility } from 'lucide-react';

export default function GlobalFooter() {
  return (
    <footer
      role="contentinfo"
      className="border-t border-border bg-card/50 py-4 px-4 mt-auto"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>DMS Hub — PA Digitale 2026 • Cloud First • Rete Mercati Made in Italy</p>
        <nav aria-label="Link legali" className="flex items-center gap-4">
          <a href="/privacy" className="hover:text-teal-400 transition-colors flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Privacy
          </a>
          <a href="/accessibilita" className="hover:text-teal-400 transition-colors flex items-center gap-1">
            <Accessibility className="h-3 w-3" />
            Accessibilita'
          </a>
        </nav>
      </div>
    </footer>
  );
}
