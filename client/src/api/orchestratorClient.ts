/**
 * Orchestrator Client - REST API verso backend Hetzner
 * 
 * L'orchestratore vive SOLO su Hetzner (mihub-backend-rest).
 * Questo client chiama direttamente https://orchestratore.mio-hub.me/mihub/orchestrator
 * 
 * NON usa tRPC, NON passa per Vercel serverless functions.
 */

// ============================================================================
// TYPES
// ============================================================================

export type OrchestratorMode = "auto" | "manual";
export type AgentId = "mio" | "dev" | "manus_worker" | "gemini_arch";

export interface OrchestratorRequest {
  mode: OrchestratorMode;
  targetAgent?: AgentId;
  conversationId?: string | null;
  message: string;
  meta?: Record<string, any>;
}

export interface OrchestratorResponse {
  success: boolean;
  agent: AgentId;
  conversationId: string | null;
  message: string | null;
  error?: {
    type: string;
    provider?: string | null;
    statusCode?: number;
    message?: string;
  } | null;
}

// ============================================================================
// CLIENT
// ============================================================================

/**
 * Base URL del backend Hetzner
 * - Production/Preview: usa VITE_API_URL se configurato
 * - Fallback: https://orchestratore.mio-hub.me
 */
const baseUrl =
  import.meta.env.VITE_API_URL ?? "https://orchestratore.mio-hub.me";

/**
 * Chiama l'orchestratore su Hetzner
 * 
 * @param payload - Richiesta orchestratore
 * @returns Risposta orchestratore
 * @throws Error se la richiesta HTTP fallisce
 */
export async function callOrchestrator(
  payload: OrchestratorRequest
): Promise<OrchestratorResponse> {
  const url = `${baseUrl}/api/mihub/orchestrator`;

  console.log("[OrchestratorClient] Chiamata a:", url);
  console.log("[OrchestratorClient] Payload:", payload);

  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  console.log("[OrchestratorClient] Status:", res.status);

  // Prova sempre a parsare il JSON, anche per errori HTTP
  // Il backend può rispondere con 4xx/5xx ma con body JSON valido
  const data = (await res.json()) as OrchestratorResponse;
  console.log("[OrchestratorClient] Risposta:", data);

  return data;
}
