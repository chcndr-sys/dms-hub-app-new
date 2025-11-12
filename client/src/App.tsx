import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import ChatWidget from "./components/ChatWidget";
import HomePage from "./pages/HomePage";
import MapPage from "./pages/MapPage";
import WalletPage from "./pages/WalletPage";
import CivicPage from "./pages/CivicPage";
import RoutePage from "./pages/RoutePage";
import VetrinePage from "./pages/VetrinePage";
import HubOperatore from "./pages/HubOperatore";
import DashboardPA from "./pages/DashboardPA";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={HomePage} />
      <Route path="/mappa" component={MapPage} />
      <Route path="/wallet" component={WalletPage} />
      <Route path="/civic" component={CivicPage} />
      <Route path="/route" component={RoutePage} />
      <Route path="/vetrine" component={VetrinePage} />
      <Route path="/hub-operatore" component={HubOperatore} />
      <Route path="/dashboard-pa" component={DashboardPA} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark" // DMS theme: dark mode con palette ufficiale
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
          <ChatWidget userRole="cliente" />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
