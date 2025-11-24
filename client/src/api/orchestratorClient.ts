/**
 * Orchestrator Client - REST API verso backend Hetzner
 * 
 * L'orchestratore vive SOLO su Hetzner (mihub-backend-rest).
 * Questo client chiama direttamente https://orchestratore.mio-hub.me/api/mihub/orchestrator
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

export interface OrchestratorResponseError {
  type: string;
  provider?: string | null;
  statusCode?: number;
  message?: string;
}

export interface OrchestratorResponse {
  success: boolean;
  agent: AgentId;
  conversationId: string | null;
  message: string | null;
  error: OrchestratorResponseError | null;
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
 * @throws Error se la richiesta HTTP fallisce o il JSON non e valido
 */
export async function callOrchestrator(
  payload: OrchestratorRequest
): Promise<OrchestratorResponse> {
  const res = await fetch(`${baseUrl}/api/mihub/orchestrator`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  console.log("[MIO_ORCH_CLIENT] raw response text", text);

  let json: any;
  try {
    json = JSON.parse(text);
  } catch (e) {
    console.error("[MIO_ORCH_CLIENT] invalid JSON", e);
    throw new Error("INVALID_JSON");
  }

  if (!res.ok) {
    console.warn("[MIO_ORCH_CLIENT] HTTP error", res.status, json);
  }

  return json as OrchestratorResponse;
}
