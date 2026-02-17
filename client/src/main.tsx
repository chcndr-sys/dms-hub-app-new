import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";
// Force CDN cache invalidation - timestamp: 1763685966

const queryClient = new QueryClient();

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: ((import.meta.env.VITE_TRPC_URL || "https://orchestratore.mio-hub.me").trim() + "/api/trpc"),
      transformer: superjson,
      fetch(input, init) {
        // Invia Authorization: Bearer <token> come fallback per i cookie cross-domain.
        // Il backend accetta sia il cookie app_session_id che l'header Authorization.
        const headers = new Headers(init?.headers);
        const sessionToken = localStorage.getItem('miohub_session_token');
        if (sessionToken) {
          headers.set('Authorization', `Bearer ${sessionToken}`);
        }
        return globalThis.fetch(input, {
          ...(init ?? {}),
          headers,
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);

// Global error monitoring — cattura errori non gestiti e li invia al backend
window.addEventListener('error', (event) => {
  const trpcUrl = (import.meta.env.VITE_TRPC_URL || '').trim();
  if (trpcUrl && event.error) {
    fetch(`${trpcUrl}/api/trpc/logs.reportClientError`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: {
          message: event.error?.message || event.message,
          stack: event.error?.stack?.slice(0, 2000),
          url: window.location.href,
          userAgent: navigator.userAgent,
        },
      }),
    }).catch(() => {});
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const trpcUrl = (import.meta.env.VITE_TRPC_URL || '').trim();
  if (trpcUrl) {
    const reason = event.reason;
    fetch(`${trpcUrl}/api/trpc/logs.reportClientError`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: {
          message: reason?.message || String(reason),
          stack: reason?.stack?.slice(0, 2000),
          url: window.location.href,
          userAgent: navigator.userAgent,
        },
      }),
    }).catch(() => {});
  }
});

// Registra Service Worker per PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed silently
    });
  });
}
