import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MioProvider } from "./contexts/MioContext";
import { AnimationProvider } from "./contexts/AnimationContext";
import { PermissionsProvider } from "./contexts/PermissionsContext";
import { TransportProvider } from "./contexts/TransportContext";
import { FirebaseAuthProvider } from "./contexts/FirebaseAuthContext";
import ChatWidget from "./components/ChatWidget";
import HomePage from "./pages/HomePage";
import MapPage from "./pages/MapPage";
import WalletPage from "./pages/WalletPage";
import CivicPage from "./pages/CivicPage";
import RoutePage from "./pages/RoutePage";
import VetrinePage from "./pages/VetrinePage";
import HubOperatore from "./pages/HubOperatore";
import DashboardPA from "./pages/DashboardPA";
import MioPage from "./pages/mio";
import GuardianEndpoints from "./pages/GuardianEndpoints";
import GuardianLogs from "./pages/GuardianLogs";
import GuardianDebug from "./pages/GuardianDebug";
import MarketGISPage from "./pages/MarketGISPage";
import LogDebugPage from "./pages/LogDebugPage";
import MappaItaliaPage from "./pages/MappaItaliaPage";
import APITokensPage from "./pages/APITokensPage";
import CouncilPage from "./pages/CouncilPage";
import SuapDashboard from "./pages/suap/SuapDashboard";
import SuapList from "./pages/suap/SuapList";
import SuapDetail from "./pages/suap/SuapDetail";
import HubMapTestPage from "./pages/HubMapTestPage";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import DashboardImpresa from "./pages/DashboardImpresa";
import AppImpresaNotifiche from "./pages/AppImpresaNotifiche";
import ImpersonationBanner from "./components/ImpersonationBanner";
// v3.70.0 - Nuove pagine App Impresa
import WalletImpresaPage from "./pages/WalletImpresaPage";
import PresenzePage from "./pages/PresenzePage";
import AnagraficaPage from "./pages/AnagraficaPage";
import PresentazionePage from "./pages/PresentazionePage";
// v3.80.0 - Verbali PM Professionali
import NuovoVerbalePage from "./pages/NuovoVerbalePage";
// v3.85.3 - Wallet mobile pages
import WalletPaga from "./pages/WalletPaga";
import WalletStorico from "./pages/WalletStorico";
// GDPR & Compliance pages
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import AccessibilityPage from "./pages/AccessibilityPage";
import ProfiloPage from "./pages/ProfiloPage";
import CookieConsentBanner from "./components/CookieConsentBanner";
import SkipToContent from "./components/SkipToContent";

function Router() {
  return (
    <Switch>
      <Route path="/" sonnElement={'exact'} component={HomePage} />
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
      <Route path="/suap" component={SuapDashboard} />
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
                      <Router />
                    </main>
                    <ChatWidget userRole="client" />
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
