import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MioProvider } from "./contexts/MioContext";
import { AnimationProvider } from "./contexts/AnimationContext";
import { PermissionsProvider } from "./contexts/PermissionsContext";
import { TransportProvider } from "./contexts/TransportContext";
import { FirebaseAuthProvider } from "./contexts/FirebaseAuthContext";
import ChatWidget from "./components/ChatWidget";
import ImpersonationBanner from "./components/ImpersonationBanner";
import CookieConsentBanner from "./components/CookieConsentBanner";
import SkipToContent from "./components/SkipToContent";
import GlobalFooter from "./components/GlobalFooter";

// Pagine critiche — caricate subito (first paint)
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";

// Lazy loading — pagine caricate on-demand per ridurre bundle iniziale
const MapPage = lazy(() => import("./pages/MapPage"));
const WalletPage = lazy(() => import("./pages/WalletPage"));
const CivicPage = lazy(() => import("./pages/CivicPage"));
const RoutePage = lazy(() => import("./pages/RoutePage"));
const VetrinePage = lazy(() => import("./pages/VetrinePage"));
const HubOperatore = lazy(() => import("./pages/HubOperatore"));
const DashboardPA = lazy(() => import("./pages/DashboardPA"));
const MioPage = lazy(() => import("./pages/mio"));
const GuardianEndpoints = lazy(() => import("./pages/GuardianEndpoints"));
const GuardianLogs = lazy(() => import("./pages/GuardianLogs"));
const GuardianDebug = lazy(() => import("./pages/GuardianDebug"));
const MarketGISPage = lazy(() => import("./pages/MarketGISPage"));
const LogDebugPage = lazy(() => import("./pages/LogDebugPage"));
const MappaItaliaPage = lazy(() => import("./pages/MappaItaliaPage"));
const APITokensPage = lazy(() => import("./pages/APITokensPage"));
const CouncilPage = lazy(() => import("./pages/CouncilPage"));
const SuapDashboard = lazy(() => import("./pages/suap/SuapDashboard"));
const SuapList = lazy(() => import("./pages/suap/SuapList"));
const SuapDetail = lazy(() => import("./pages/suap/SuapDetail"));
const HubMapTestPage = lazy(() => import("./pages/HubMapTestPage"));
const DashboardImpresa = lazy(() => import("./pages/DashboardImpresa"));
const AppImpresaNotifiche = lazy(() => import("./pages/AppImpresaNotifiche"));
const WalletImpresaPage = lazy(() => import("./pages/WalletImpresaPage"));
const PresenzePage = lazy(() => import("./pages/PresenzePage"));
const AnagraficaPage = lazy(() => import("./pages/AnagraficaPage"));
const PresentazionePage = lazy(() => import("./pages/PresentazionePage"));
const NuovoVerbalePage = lazy(() => import("./pages/NuovoVerbalePage"));
const WalletPaga = lazy(() => import("./pages/WalletPaga"));
const WalletStorico = lazy(() => import("./pages/WalletStorico"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const AccessibilityPage = lazy(() => import("./pages/AccessibilityPage"));
const ProfiloPage = lazy(() => import("./pages/ProfiloPage"));

function LazyFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background" role="status" aria-live="polite">
      <div className="text-teal-400 animate-pulse text-lg">Caricamento...</div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/mappa" component={MapPage} />
      <Route path="/wallet" component={WalletPage} />
      <Route path="/wallet/paga" component={WalletPaga} />
      <Route path="/wallet/storico" component={WalletStorico} />
      <Route path="/civic" component={CivicPage} />
      <Route path="/route" component={RoutePage} />
      <Route path="/vetrine/:id" component={VetrinePage} />
      <Route path="/vetrine" component={VetrinePage} />
      <Route path="/hub-operatore" component={HubOperatore} />
      <Route path="/dashboard-pa" component={DashboardPA} />
      <Route path="/mio" component={MioPage} />
      <Route path="/guardian/endpoints" component={GuardianEndpoints} />
      <Route path="/guardian/logs" component={GuardianLogs} />
      <Route path="/guardian/debug" component={GuardianDebug} />
      <Route path="/market-gis" component={MarketGISPage} />
      <Route path="/mappa-italia" component={MappaItaliaPage} />
      <Route path="/log-debug" component={LogDebugPage} />
      <Route path="/settings/api-tokens" component={APITokensPage} />
      <Route path="/council" component={CouncilPage} />
      <Route path="/suap" component={() => <SuapDashboard />} />
      <Route path="/suap/list" component={SuapList} />
      <Route path="/suap/detail/:id" component={SuapDetail} />
      <Route path="/hub-map-test" component={HubMapTestPage} />
      <Route path="/login" component={Login} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route path="/dashboard-impresa" component={DashboardImpresa} />
      <Route path="/app/impresa/notifiche" component={AppImpresaNotifiche} />
      {/* v3.70.0 - Nuove route App Impresa */}
      <Route path="/app/impresa/wallet" component={WalletImpresaPage} />
      <Route path="/app/impresa/presenze" component={PresenzePage} />
      <Route path="/app/impresa/anagrafica" component={AnagraficaPage} />
      {/* v3.74.0 - Presentazione pubblica */}
      <Route path="/presentazione" component={PresentazionePage} />
      {/* v3.80.0 - Verbali PM Professionali */}
      <Route path="/pm/nuovo-verbale" component={NuovoVerbalePage} />
      {/* GDPR & Compliance */}
      <Route path="/privacy" component={PrivacyPolicyPage} />
      <Route path="/accessibilita" component={AccessibilityPage} />
      <Route path="/profilo" component={ProfiloPage} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
      >
        <FirebaseAuthProvider>
          <AnimationProvider>
            <MioProvider>
              <PermissionsProvider>
                <TransportProvider>
                  <TooltipProvider>
                    <SkipToContent />
                    <ImpersonationBanner />
                    <Toaster />
                    <main id="main-content" role="main">
                      <Suspense fallback={<LazyFallback />}>
                        <Router />
                      </Suspense>
                    </main>
                    <GlobalFooter />
                    <ChatWidget userRole="cliente" />
                    <CookieConsentBanner />
                  </TooltipProvider>
                </TransportProvider>
              </PermissionsProvider>
            </MioProvider>
          </AnimationProvider>
        </FirebaseAuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
// Deploy trigger Fri Jan 24 03:30:00 EST 2026 - v3.70.0 App Impresa
