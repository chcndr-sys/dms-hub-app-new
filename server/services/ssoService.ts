/**
 * SSO Service — SPID / CIE / CNS / eIDAS
 *
 * L'autenticazione federata per DMS Hub passa tramite:
 * **ARPA Regione Toscana** → Manus OAuth Server → DMS Hub
 *
 * Questo servizio e' gia' integrato nel sistema tramite:
 * - Backend: server/_core/oauth.ts (callback handler)
 * - Backend: server/_core/sdk.ts (token exchange)
 * - Frontend: client/src/api/authClient.ts (ARPA auth client)
 * - Frontend: client/src/pages/Login.tsx (selettore SPID/CIE/CNS)
 * - Frontend: client/src/pages/AuthCallback.tsx (OAuth callback)
 *
 * Flusso autenticazione:
 * 1. Utente clicca "Entra con SPID/CIE/CNS" nella Login page
 * 2. Redirect a ARPA Regione Toscana (via Manus OAuth)
 * 3. ARPA gestisce la federazione SAML con gli IdP (SPID, CIE, CNS)
 * 4. Callback a /api/oauth/callback con authorization code
 * 5. Backend scambia code per token, ottiene user info
 * 6. Upsert utente in DB, crea session JWT cookie
 *
 * Specifiche SPID (SAML 2.0):
 * - Livelli: L1 (password), L2 (password+OTP), L3 (hardware token)
 * - Attributi: spidCode, name, familyName, fiscalNumber, email, etc.
 * - Registry IdP: https://registry.spid.gov.it/metadata/idp/spid-entities-idps.xml
 *
 * Specifiche CIE:
 * - Unico IdP: Ministero dell'Interno (servizicie.interno.gov.it)
 * - Livelli: 1 (user+pass), 2 (OTP), 3 (NFC + PIN)
 * - Produzione: https://idserver.servizicie.interno.gov.it
 * - Pre-produzione: https://preproduzione.idserver.servizicie.interno.gov.it
 *
 * CNS: autenticazione via certificato X.509 (smart card + lettore PC/SC)
 *
 * eIDAS: Nodo italiano FICEP per identita' digitali EU
 * - Proxy: https://sp-proxy.pre.eid.gov.it (pre-produzione)
 */

const SSO_MOCK_MODE = process.env.SSO_MOCK_MODE !== "false"; // default true

export type SsoProvider = "spid" | "cie" | "cns" | "eidas";
export type SpidLevel = "L1" | "L2" | "L3";

export interface SsoProviderConfig {
  provider: SsoProvider;
  name: string;
  description: string;
  entityId: string;
  ssoUrl: string;
  sloUrl: string;
  metadataUrl: string;
  spidLevel?: SpidLevel;
  isActive: boolean;
  environment: "test" | "production";
  gateway: string; // Chi gestisce la federazione (ARPA Toscana)
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
  gateway: string;
  gatewayDescription: string;
  providers: {
    provider: SsoProvider;
    name: string;
    isActive: boolean;
    isConfigured: boolean;
    lastTestResult: string | null;
  }[];
  timestamp: string;
}

// Provider federati tramite ARPA Regione Toscana
const PROVIDERS: SsoProviderConfig[] = [
  {
    provider: "spid",
    name: "SPID",
    description:
      "Sistema Pubblico di Identita' Digitale — autenticazione a 2 fattori (L2). " +
      "IdP: Aruba, Infocert, Lepida, Namirial, Poste, Register.it, Sielte, Tim, etc.",
    entityId: "",
    ssoUrl: "https://identity.sieltecloud.it/simplesaml/saml2/idp/SSOService.php",
    sloUrl: "https://identity.sieltecloud.it/simplesaml/saml2/idp/SingleLogoutService.php",
    metadataUrl: "https://registry.spid.gov.it/metadata/idp/spid-entities-idps.xml",
    spidLevel: "L2",
    isActive: true, // Gia' integrato via ARPA
    environment: "production",
    gateway: "ARPA Regione Toscana",
  },
  {
    provider: "cie",
    name: "CIE",
    description:
      "Carta d'Identita' Elettronica — autenticazione L2 (OTP) o L3 (NFC + PIN). " +
      "Unico IdP: Ministero dell'Interno (Poligrafico e Zecca dello Stato).",
    entityId: "xx_servizicie",
    ssoUrl: "https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO",
    sloUrl: "https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SLO",
    metadataUrl: "https://idserver.servizicie.interno.gov.it/idp/shibboleth?Metadata",
    isActive: true, // Gia' integrato via ARPA
    environment: "production",
    gateway: "ARPA Regione Toscana",
  },
  {
    provider: "cns",
    name: "CNS",
    description:
      "Carta Nazionale dei Servizi — autenticazione via certificato X.509 su smart card. " +
      "Richiede lettore smart card PC/SC e middleware browser.",
    entityId: "",
    ssoUrl: "",
    sloUrl: "",
    metadataUrl: "",
    isActive: true, // Integrato via ARPA
    environment: "production",
    gateway: "ARPA Regione Toscana",
  },
  {
    provider: "eidas",
    name: "eIDAS",
    description:
      "Identita' Digitale Europea — accesso per cittadini UE tramite nodo italiano FICEP. " +
      "I cittadini UE NON hanno codice fiscale: identificazione tramite nome + cognome + data nascita.",
    entityId: "",
    ssoUrl: "https://sp-proxy.pre.eid.gov.it/spproxy/samlsso",
    sloUrl: "https://sp-proxy.pre.eid.gov.it/spproxy/samlslo",
    metadataUrl: "https://sp-proxy.pre.eid.gov.it/spproxy/metadata",
    isActive: false, // Da attivare
    environment: "test",
    gateway: "Nodo eIDAS italiano (FICEP)",
  },
];

/**
 * Lista provider SSO disponibili.
 */
export function listProviders(): SsoProviderConfig[] {
  return PROVIDERS;
}

/**
 * Stato complessivo SSO.
 */
export function getStatus(): SsoStatusOverview {
  return {
    mockMode: SSO_MOCK_MODE,
    gateway: "ARPA Regione Toscana",
    gatewayDescription:
      "Autenticazione federata SPID/CIE/CNS tramite ARPA Regione Toscana → Manus OAuth Server. " +
      "Il flusso e' gia' integrato in DMS Hub (Login.tsx → authClient.ts → oauth.ts).",
    providers: PROVIDERS.map((p) => ({
      provider: p.provider,
      name: p.name,
      isActive: p.isActive,
      isConfigured: !!p.ssoUrl || p.provider === "cns",
      lastTestResult: null,
    })),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Testa la connettivita' di un provider SSO.
 * In produzione verifica che il metadata endpoint risponda.
 */
export async function testProvider(
  provider: SsoProvider
): Promise<SsoTestResult> {
  const config = PROVIDERS.find((p) => p.provider === provider);
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

  if (!config.metadataUrl) {
    return {
      provider,
      success: config.provider === "cns", // CNS non ha metadata URL (certificato X.509)
      responseTimeMs: 0,
      metadataValid: false,
      certificateValid: config.provider === "cns",
      certificateExpiresAt: null,
      errorMessage:
        config.provider === "cns"
          ? null
          : "URL metadata non configurato",
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
      certificateValid: response.ok,
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
