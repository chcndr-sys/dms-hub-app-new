/**
 * SSO Service — SPID / CIE / CNS / eIDAS
 *
 * Predisposizione per autenticazione federata tramite:
 * - SPID (Sistema Pubblico di Identita' Digitale)
 * - CIE (Carta d'Identita' Elettronica)
 * - CNS (Carta Nazionale dei Servizi)
 * - eIDAS (Electronic Identification and Trust Services)
 *
 * Con SSO_MOCK_MODE=true (default), simula tutte le risposte.
 */

const SSO_MOCK_MODE = process.env.SSO_MOCK_MODE !== "false"; // default true

export type SsoProvider = "spid" | "cie" | "cns" | "eidas";
export type SpidLevel = "L1" | "L2" | "L3";

export interface SsoProviderConfig {
  provider: SsoProvider;
  name: string;
  entityId: string;
  ssoUrl: string;
  sloUrl: string;
  metadataUrl: string;
  spidLevel?: SpidLevel;
  isActive: boolean;
  environment: "test" | "production";
}

export interface SsoTestResult {
  provider: SsoProvider;
  success: boolean;
  responseTimeMs: number;
  metadataValid: boolean;
  certificateValid: boolean;
  certificateExpiresAt: string | null;
  errorMessage: string | null;
  timestamp: string;
}

export interface SsoStatusOverview {
  mockMode: boolean;
  providers: {
    provider: SsoProvider;
    name: string;
    isActive: boolean;
    isConfigured: boolean;
    lastTestResult: string | null;
  }[];
  timestamp: string;
}

// Provider predefiniti per l'Italia
const DEFAULT_PROVIDERS: SsoProviderConfig[] = [
  {
    provider: "spid",
    name: "SPID - Sistema Pubblico di Identita' Digitale",
    entityId: "",
    ssoUrl: "https://identity.sieltecloud.it/simplesaml/saml2/idp/SSOService.php",
    sloUrl: "https://identity.sieltecloud.it/simplesaml/saml2/idp/SingleLogoutService.php",
    metadataUrl: "https://registry.spid.gov.it/metadata/idp",
    spidLevel: "L2",
    isActive: false,
    environment: "test",
  },
  {
    provider: "cie",
    name: "CIE - Carta d'Identita' Elettronica",
    entityId: "",
    ssoUrl: "https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO",
    sloUrl: "https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SLO",
    metadataUrl: "https://idserver.servizicie.interno.gov.it/idp/shibboleth",
    isActive: false,
    environment: "test",
  },
  {
    provider: "cns",
    name: "CNS - Carta Nazionale dei Servizi",
    entityId: "",
    ssoUrl: "",
    sloUrl: "",
    metadataUrl: "",
    isActive: false,
    environment: "test",
  },
  {
    provider: "eidas",
    name: "eIDAS - Identita' Digitale Europea",
    entityId: "",
    ssoUrl: "https://sp-proxy.pre.eid.gov.it/spproxy/samlsso",
    sloUrl: "https://sp-proxy.pre.eid.gov.it/spproxy/samlslo",
    metadataUrl: "https://sp-proxy.pre.eid.gov.it/spproxy/metadata",
    isActive: false,
    environment: "test",
  },
];

/**
 * Lista provider SSO disponibili con stato.
 */
export function listProviders(): SsoProviderConfig[] {
  return DEFAULT_PROVIDERS;
}

/**
 * Stato complessivo SSO.
 */
export function getStatus(): SsoStatusOverview {
  return {
    mockMode: SSO_MOCK_MODE,
    providers: DEFAULT_PROVIDERS.map((p) => ({
      provider: p.provider,
      name: p.name,
      isActive: p.isActive,
      isConfigured: !!p.entityId && !!p.ssoUrl,
      lastTestResult: null,
    })),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Testa la connettivita' di un provider SSO specifico.
 */
export async function testProvider(
  provider: SsoProvider
): Promise<SsoTestResult> {
  const config = DEFAULT_PROVIDERS.find((p) => p.provider === provider);
  if (!config) {
    throw new Error(`Provider SSO non trovato: ${provider}`);
  }

  if (SSO_MOCK_MODE) {
    return {
      provider,
      success: true,
      responseTimeMs: Math.floor(Math.random() * 200) + 50,
      metadataValid: true,
      certificateValid: true,
      certificateExpiresAt: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString(),
      errorMessage: null,
      timestamp: new Date().toISOString(),
    };
  }

  // Produzione: verifica metadata endpoint
  if (!config.metadataUrl) {
    return {
      provider,
      success: false,
      responseTimeMs: 0,
      metadataValid: false,
      certificateValid: false,
      certificateExpiresAt: null,
      errorMessage: "URL metadata non configurato",
      timestamp: new Date().toISOString(),
    };
  }

  const startTime = Date.now();
  try {
    const response = await fetch(config.metadataUrl, {
      signal: AbortSignal.timeout(10000),
    });
    const responseTimeMs = Date.now() - startTime;

    return {
      provider,
      success: response.ok,
      responseTimeMs,
      metadataValid: response.ok,
      certificateValid: response.ok, // In produzione verificare il certificato X.509
      certificateExpiresAt: null,
      errorMessage: response.ok
        ? null
        : `HTTP ${response.status} ${response.statusText}`,
      timestamp: new Date().toISOString(),
    };
  } catch (err: unknown) {
    return {
      provider,
      success: false,
      responseTimeMs: Date.now() - startTime,
      metadataValid: false,
      certificateValid: false,
      certificateExpiresAt: null,
      errorMessage:
        err instanceof Error ? err.message : "Errore sconosciuto",
      timestamp: new Date().toISOString(),
    };
  }
}
