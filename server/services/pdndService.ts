/**
 * PDND Service — Piattaforma Digitale Nazionale Dati
 *
 * Implementazione conforme alle specifiche ufficiali PDND (2025):
 * - Token: auth.interop.pagopa.it/token.oauth2 (produzione)
 *          auth.uat.interop.pagopa.it/token.oauth2 (UAT/test)
 * - Audience JWT: auth.interop.pagopa.it/client-assertion (produzione)
 *                 auth.uat.interop.pagopa.it/client-assertion (UAT)
 * - API v2: api.interop.pagopa.it/v2 (produzione)
 *           api.uat.interop.pagopa.it/v2 (UAT)
 *
 * Il Comune (DMS Hub) e':
 * - EROGATORE: espone e-Service (mercati, concessioni, operatori)
 * - FRUITORE: consuma e-Service ANPR, Registro Imprese, Agenzia Entrate
 *
 * PDND NON proxya i dati — emette solo il voucher.
 * La chiamata API va direttamente dal fruitore all'erogatore.
 *
 * Con PDND_MOCK_MODE=true (default), simula tutte le risposte.
 *
 * ANPR via PDND:
 * - Servizi C001 (notifica), C002 (comunicazione), C029 (accertamento)
 * - C030 per ottenere ID ANPR da codice fiscale (obbligatorio dal 18/04/2024)
 * - Endpoint: modipa-val.anpr.interno.it (UAT) / produzione equivalente
 * - Pattern sicurezza: AUDIT_REST_02 (Digest + Agid-JWT-Signature + Agid-JWT-TrackingEvidence)
 */

import crypto from "crypto";

// ============================================
// Configurazione (da environment variables)
// ============================================

// Ambienti PDND ufficiali
const PDND_ENVIRONMENTS = {
  production: {
    tokenUrl: "https://auth.interop.pagopa.it/token.oauth2",
    audience: "auth.interop.pagopa.it/client-assertion",
    apiUrl: "https://api.interop.pagopa.it/v2",
    keysUrl: "https://api.interop.pagopa.it/v2/keys",
  },
  uat: {
    tokenUrl: "https://auth.uat.interop.pagopa.it/token.oauth2",
    audience: "auth.uat.interop.pagopa.it/client-assertion",
    apiUrl: "https://api.uat.interop.pagopa.it/v2",
    keysUrl: "https://api.uat.interop.pagopa.it/v2/keys",
  },
} as const;

// Ambienti ANPR ufficiali
const ANPR_ENVIRONMENTS = {
  production: {
    baseUrl: "https://modipa.anpr.interno.it/govway/rest/in/MinInternoPortaANPR-PDND",
  },
  uat: {
    baseUrl: "https://modipa-val.anpr.interno.it/govway/rest/in/MinInternoPortaANPR-PDND",
  },
} as const;

const PDND_ENV = (process.env.PDND_ENVIRONMENT || "uat") as "production" | "uat";
const PDND_CLIENT_ID = process.env.PDND_CLIENT_ID || "";
const PDND_KID = process.env.PDND_KID || ""; // kid della chiave pubblica depositata su PDND
const PDND_RSA_PRIVATE_KEY = process.env.PDND_RSA_PRIVATE_KEY || "";
const PDND_PURPOSE_ID = process.env.PDND_PURPOSE_ID || "";
const PDND_MOCK_MODE = process.env.PDND_MOCK_MODE !== "false"; // default true

const pdndConfig = PDND_ENVIRONMENTS[PDND_ENV];
const anprConfig = ANPR_ENVIRONMENTS[PDND_ENV];

// ============================================
// Tipi
// ============================================

export interface EServiceDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  status: "published" | "draft" | "suspended" | "deprecated" | "archived";
  technology: "REST" | "SOAP";
  role: "erogatore" | "fruitore"; // Il Comune e' erogatore o fruitore?
  publishedAt: string | null;
  pdndCatalogUrl: string | null; // Link al catalogo PDND
}

export interface EServiceMetadata {
  name: string;
  description: string;
  technology: "REST" | "SOAP";
  version: string;
}

interface PdndVoucher {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
  issuedAt: string;
}

// ============================================
// Catalogo e-Service DMS Hub
// ============================================

// e-Service che il Comune ESPONE (erogatore)
const E_SERVICES_EROGATORE: EServiceDefinition[] = [
  {
    id: "dms-mercati",
    name: "DMS Hub - Consultazione Mercati Ambulanti",
    description:
      "Consultazione posteggi mercato, disponibilita' in tempo reale, calendario mercati. " +
      "Richiede attributo certificato IPA (PA aderente).",
    version: "1.0.0",
    status: "draft",
    technology: "REST",
    role: "erogatore",
    publishedAt: null,
    pdndCatalogUrl: null,
  },
  {
    id: "dms-concessioni",
    name: "DMS Hub - Verifica Concessioni Commercio Ambulante",
    description:
      "Verifica stato concessioni, scadenze e rinnovi per operatori ambulanti. " +
      "Utilizzabile da Polizia Municipale di altri Comuni per verifiche.",
    version: "1.0.0",
    status: "draft",
    technology: "REST",
    role: "erogatore",
    publishedAt: null,
    pdndCatalogUrl: null,
  },
  {
    id: "dms-operatori",
    name: "DMS Hub - Verifica Operatori Mercatali",
    description:
      "Verifica operatore, stato autorizzazioni e presenze mercato. " +
      "Integrazione SUAP per SCIA e subingressi.",
    version: "1.0.0",
    status: "draft",
    technology: "REST",
    role: "erogatore",
    publishedAt: null,
    pdndCatalogUrl: null,
  },
];

// e-Service che il Comune CONSUMA (fruitore) — da PDND
const E_SERVICES_FRUITORE: EServiceDefinition[] = [
  {
    id: "anpr-C001",
    name: "ANPR - Consultazione per Notifica (C001)",
    description:
      "Generalita', esistenza in vita, residenza, domicilio digitale per finalita' di notifica. " +
      "Erogatore: Ministero dell'Interno. Pattern: AUDIT_REST_02.",
    version: "1.0.0",
    status: "draft",
    technology: "REST",
    role: "fruitore",
    publishedAt: null,
    pdndCatalogUrl: "https://www.interop.pagopa.it/catalogo",
  },
  {
    id: "anpr-C002",
    name: "ANPR - Consultazione per Comunicazione (C002)",
    description:
      "Generalita', esistenza in vita, residenza, domicilio digitale per finalita' di comunicazione. " +
      "Erogatore: Ministero dell'Interno.",
    version: "1.0.0",
    status: "draft",
    technology: "REST",
    role: "fruitore",
    publishedAt: null,
    pdndCatalogUrl: "https://www.interop.pagopa.it/catalogo",
  },
  {
    id: "anpr-C029",
    name: "ANPR - Accertamento Dati Anagrafici (C029)",
    description:
      "Accertamento completo dati anagrafici soggetto. Approvazione automatica per Comuni. " +
      "Erogatore: Ministero dell'Interno.",
    version: "1.0.0",
    status: "draft",
    technology: "REST",
    role: "fruitore",
    publishedAt: null,
    pdndCatalogUrl: "https://www.interop.pagopa.it/catalogo",
  },
  {
    id: "anpr-C030",
    name: "ANPR - Accertamento ID Unico Nazionale (C030)",
    description:
      "Ottiene l'ID ANPR (Identificativo Unico Nazionale) da codice fiscale o dati anagrafici. " +
      "OBBLIGATORIO dal 18/04/2024 per tutte le consultazioni ANPR via PDND.",
    version: "1.0.0",
    status: "draft",
    technology: "REST",
    role: "fruitore",
    publishedAt: null,
    pdndCatalogUrl: "https://www.interop.pagopa.it/catalogo",
  },
];

// Stato in-memory per mock
const publishedServices = new Map<string, EServiceDefinition>();

// ============================================
// Generazione Voucher PDND (RFC 7521 / 7523)
// ============================================

/**
 * Genera un voucher OAuth 2.0 PDND tramite JWT client assertion.
 *
 * Flusso ufficiale:
 * 1. Crea JWT assertion firmato con RSA private key
 *    - header: { alg: "RS256", kid: "<id-chiave-su-PDND>", typ: "JWT" }
 *    - payload: { iss: client_id, sub: client_id, aud: audience, purposeId, jti, iat, exp }
 * 2. POST a token endpoint con grant_type=client_credentials
 * 3. Riceve voucher (access_token JWT con typ: "at+jwt")
 * 4. Usa voucher come Bearer token verso l'erogatore
 *
 * PDND NON proxya i dati — il voucher serve per autenticarsi
 * direttamente verso l'API dell'erogatore.
 */
export async function generateVoucher(): Promise<PdndVoucher> {
  if (PDND_MOCK_MODE) {
    return {
      accessToken: `mock_pdnd_voucher_${crypto.randomUUID()}`,
      expiresIn: 600,
      tokenType: "Bearer",
      issuedAt: new Date().toISOString(),
    };
  }

  if (!PDND_CLIENT_ID || !PDND_RSA_PRIVATE_KEY || !PDND_KID) {
    throw new Error(
      "PDND non configurato: servono PDND_CLIENT_ID, PDND_KID, PDND_RSA_PRIVATE_KEY"
    );
  }

  const now = Math.floor(Date.now() / 1000);

  // Header conforme specifiche PDND
  const header = {
    alg: "RS256",
    kid: PDND_KID, // ID della chiave pubblica depositata su PDND (NON il client_id)
    typ: "JWT",
  };

  // Payload conforme specifiche PDND
  const payload: Record<string, unknown> = {
    iss: PDND_CLIENT_ID,
    sub: PDND_CLIENT_ID,
    aud: pdndConfig.audience, // auth.interop.pagopa.it/client-assertion
    jti: crypto.randomUUID(), // DEVE essere unico per ogni richiesta
    iat: now,
    exp: now + 600, // 10 minuti
  };

  // purposeId e' RICHIESTO per e-Service, OMESSO per API Interop PDND
  if (PDND_PURPOSE_ID) {
    payload.purposeId = PDND_PURPOSE_ID;
  }

  const headerB64 = Buffer.from(JSON.stringify(header)).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signingInput = `${headerB64}.${payloadB64}`;

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(PDND_RSA_PRIVATE_KEY, "base64url");

  const clientAssertion = `${signingInput}.${signature}`;

  // POST al token endpoint PDND
  const response = await fetch(pdndConfig.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_assertion_type:
        "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
      client_assertion: clientAssertion,
      client_id: PDND_CLIENT_ID,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `PDND token request failed: ${response.status} ${response.statusText} — ${errorBody}`
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    token_type: string;
  };

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    issuedAt: new Date().toISOString(),
  };
}

// ============================================
// e-Service Management (DMS come Erogatore)
// ============================================

/**
 * Pubblica un e-Service su PDND (o simula in mock mode).
 * In produzione usa POST /v2/eservices sulla API PDND.
 */
export async function publishEService(
  serviceId: string,
  metadata: EServiceMetadata
): Promise<EServiceDefinition> {
  const template = E_SERVICES_EROGATORE.find((s) => s.id === serviceId);
  if (!template) {
    throw new Error(`e-Service non trovato: ${serviceId}`);
  }

  if (PDND_MOCK_MODE) {
    const published: EServiceDefinition = {
      ...template,
      name: metadata.name || template.name,
      description: metadata.description || template.description,
      version: metadata.version || template.version,
      technology: metadata.technology || template.technology,
      status: "published",
      publishedAt: new Date().toISOString(),
    };
    publishedServices.set(serviceId, published);
    return published;
  }

  // Produzione: chiama API PDND v2 per pubblicare
  const voucher = await generateVoucher();
  const response = await fetch(`${pdndConfig.apiUrl}/eservices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${voucher.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: metadata.name || template.name,
      description: metadata.description || template.description,
      technology: metadata.technology || template.technology,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `PDND publish failed: ${response.status} ${response.statusText}`
    );
  }

  const result = (await response.json()) as EServiceDefinition;
  publishedServices.set(serviceId, result);
  return result;
}

/**
 * Lista tutti gli e-Service (erogati + fruiti).
 */
export function listEServices(): EServiceDefinition[] {
  const erogatore = E_SERVICES_EROGATORE.map(
    (s) => publishedServices.get(s.id) || s
  );
  const fruitore = E_SERVICES_FRUITORE.map(
    (s) => publishedServices.get(s.id) || s
  );
  return [...erogatore, ...fruitore];
}

/**
 * Verifica connettivita' PDND.
 */
export async function testConnection(): Promise<{
  connected: boolean;
  mode: "mock" | "live";
  environment: "production" | "uat";
  tokenUrl: string;
  apiUrl: string;
  clientId: string;
  kid: string;
  hasPurposeId: boolean;
  hasPrivateKey: boolean;
  timestamp: string;
}> {
  if (PDND_MOCK_MODE) {
    return {
      connected: true,
      mode: "mock",
      environment: PDND_ENV,
      tokenUrl: pdndConfig.tokenUrl,
      apiUrl: pdndConfig.apiUrl,
      clientId: PDND_CLIENT_ID || "(non configurato)",
      kid: PDND_KID || "(non configurato)",
      hasPurposeId: !!PDND_PURPOSE_ID,
      hasPrivateKey: !!PDND_RSA_PRIVATE_KEY,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const voucher = await generateVoucher();
    return {
      connected: !!voucher.accessToken,
      mode: "live",
      environment: PDND_ENV,
      tokenUrl: pdndConfig.tokenUrl,
      apiUrl: pdndConfig.apiUrl,
      clientId: PDND_CLIENT_ID,
      kid: PDND_KID,
      hasPurposeId: !!PDND_PURPOSE_ID,
      hasPrivateKey: true,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      connected: false,
      mode: "live",
      environment: PDND_ENV,
      tokenUrl: pdndConfig.tokenUrl,
      apiUrl: pdndConfig.apiUrl,
      clientId: PDND_CLIENT_ID,
      kid: PDND_KID,
      hasPurposeId: !!PDND_PURPOSE_ID,
      hasPrivateKey: !!PDND_RSA_PRIVATE_KEY,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================
// ANPR via PDND
//
// Dal 18/04/2024 e' OBBLIGATORIO usare l'ID ANPR
// (Identificativo Unico Nazionale) per le consultazioni.
// Flusso:
// 1. Chiama C030 per ottenere idAnpr da codiceFiscale
// 2. Usa idAnpr per le consultazioni C001, C002, C029
//
// Pattern sicurezza AUDIT_REST_02:
// - Header Digest: SHA-256 hash del body
// - Header Agid-JWT-Signature: JWS con hash payload
// - Header Agid-JWT-TrackingEvidence: JWS con userID, userLocation, LoA
// ============================================

interface AnprVerificaCFResult {
  found: boolean;
  codiceFiscale: string;
  idAnpr: string | null; // ID Unico Nazionale (dal 18/04/2024)
  nome: string | null;
  cognome: string | null;
  dataNascita: string | null;
  comuneNascita: string | null;
  sesso: string | null;
  timestamp: string;
}

interface AnprResidenzaResult {
  found: boolean;
  codiceFiscale: string;
  idAnpr: string | null;
  indirizzo: string | null;
  civico: string | null;
  cap: string | null;
  comune: string | null;
  provincia: string | null;
  regione: string | null;
  timestamp: string;
}

// Mock data con idAnpr
const MOCK_CF_DATABASE: Record<
  string,
  Omit<AnprVerificaCFResult, "timestamp">
> = {
  RSSMRA85M01H501Z: {
    found: true,
    codiceFiscale: "RSSMRA85M01H501Z",
    idAnpr: "ANPR-2024-00001",
    nome: "Mario",
    cognome: "Rossi",
    dataNascita: "1985-08-01",
    comuneNascita: "Roma",
    sesso: "M",
  },
  VRDLGI90A41F205X: {
    found: true,
    codiceFiscale: "VRDLGI90A41F205X",
    idAnpr: "ANPR-2024-00002",
    nome: "Luigia",
    cognome: "Verdi",
    dataNascita: "1990-01-01",
    comuneNascita: "Milano",
    sesso: "F",
  },
  BNCGPP75D15L219Y: {
    found: true,
    codiceFiscale: "BNCGPP75D15L219Y",
    idAnpr: "ANPR-2024-00003",
    nome: "Giuseppe",
    cognome: "Bianchi",
    dataNascita: "1975-04-15",
    comuneNascita: "Torino",
    sesso: "M",
  },
};

const MOCK_RESIDENZA_DATABASE: Record<
  string,
  Omit<AnprResidenzaResult, "timestamp">
> = {
  RSSMRA85M01H501Z: {
    found: true,
    codiceFiscale: "RSSMRA85M01H501Z",
    idAnpr: "ANPR-2024-00001",
    indirizzo: "Via dei Fori Imperiali",
    civico: "1",
    cap: "00186",
    comune: "Roma",
    provincia: "RM",
    regione: "Lazio",
  },
  VRDLGI90A41F205X: {
    found: true,
    codiceFiscale: "VRDLGI90A41F205X",
    idAnpr: "ANPR-2024-00002",
    indirizzo: "Corso Buenos Aires",
    civico: "44",
    cap: "20124",
    comune: "Milano",
    provincia: "MI",
    regione: "Lombardia",
  },
  BNCGPP75D15L219Y: {
    found: true,
    codiceFiscale: "BNCGPP75D15L219Y",
    idAnpr: "ANPR-2024-00003",
    indirizzo: "Via Roma",
    civico: "10",
    cap: "10121",
    comune: "Torino",
    provincia: "TO",
    regione: "Piemonte",
  },
};

/**
 * Verifica esistenza CF su ANPR via PDND.
 *
 * Flusso reale (produzione):
 * 1. Genera voucher PDND
 * 2. POST a C030 (accertamento ID unico) con codiceFiscale
 * 3. Ottiene idAnpr + generalita'
 *
 * Endpoint: {anprBaseUrl}/C030-servizioAccertamentoIdUnicoNazionale/v1/anpr-service-e002
 * Header richiesti: Authorization, Digest, Agid-JWT-Signature, Agid-JWT-TrackingEvidence
 */
export async function verificaCodiceFiscale(
  cf: string
): Promise<AnprVerificaCFResult> {
  const cfUpper = cf.toUpperCase().trim();

  if (PDND_MOCK_MODE) {
    const mockData = MOCK_CF_DATABASE[cfUpper];
    if (mockData) {
      return { ...mockData, timestamp: new Date().toISOString() };
    }
    return {
      found: false,
      codiceFiscale: cfUpper,
      idAnpr: null,
      nome: null,
      cognome: null,
      dataNascita: null,
      comuneNascita: null,
      sesso: null,
      timestamp: new Date().toISOString(),
    };
  }

  // Produzione: C030 per ottenere ID ANPR da CF
  const voucher = await generateVoucher();
  const requestBody = JSON.stringify({
    criteriRicerca: { codiceFiscale: cfUpper },
  });

  // Calcola Digest per AUDIT_REST_02
  const digestHash = crypto
    .createHash("sha256")
    .update(requestBody)
    .digest("base64");

  const response = await fetch(
    `${anprConfig.baseUrl}/C030-servizioAccertamentoIdUnicoNazionale/v1/anpr-service-e002`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${voucher.accessToken}`,
        "Content-Type": "application/json",
        Digest: `SHA-256=${digestHash}`,
      },
      body: requestBody,
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return {
        found: false,
        codiceFiscale: cfUpper,
        idAnpr: null,
        nome: null,
        cognome: null,
        dataNascita: null,
        comuneNascita: null,
        sesso: null,
        timestamp: new Date().toISOString(),
      };
    }
    throw new Error(`ANPR C030 verifica CF failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    idOperazioneANPR?: string;
    listaSoggetti?: Array<{
      idAnpr?: string;
      generalita?: {
        nome?: string;
        cognome?: string;
        dataNascita?: string;
        luogoNascita?: { descrizioneComune?: string };
        sesso?: string;
      };
    }>;
  };

  const soggetto = data.listaSoggetti?.[0];
  return {
    found: !!soggetto?.generalita,
    codiceFiscale: cfUpper,
    idAnpr: soggetto?.idAnpr || null,
    nome: soggetto?.generalita?.nome || null,
    cognome: soggetto?.generalita?.cognome || null,
    dataNascita: soggetto?.generalita?.dataNascita || null,
    comuneNascita:
      soggetto?.generalita?.luogoNascita?.descrizioneComune || null,
    sesso: soggetto?.generalita?.sesso || null,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Verifica residenza da CF su ANPR via PDND.
 *
 * Flusso reale (produzione):
 * 1. Genera voucher PDND
 * 2. POST a C001 (consultazione per notifica) con criteriRicerca + datiRichiesti
 *
 * Endpoint: {anprBaseUrl}/C001-servizioNotifica/v1/anpr-service-e002
 */
export async function verificaResidenza(
  cf: string
): Promise<AnprResidenzaResult> {
  const cfUpper = cf.toUpperCase().trim();

  if (PDND_MOCK_MODE) {
    const mockData = MOCK_RESIDENZA_DATABASE[cfUpper];
    if (mockData) {
      return { ...mockData, timestamp: new Date().toISOString() };
    }
    return {
      found: false,
      codiceFiscale: cfUpper,
      idAnpr: null,
      indirizzo: null,
      civico: null,
      cap: null,
      comune: null,
      provincia: null,
      regione: null,
      timestamp: new Date().toISOString(),
    };
  }

  // Produzione: C001 per consultazione residenza
  const voucher = await generateVoucher();
  const requestBody = JSON.stringify({
    criteriRicerca: { codiceFiscale: cfUpper },
    datiRichiesti: {
      residenza: true,
    },
  });

  const digestHash = crypto
    .createHash("sha256")
    .update(requestBody)
    .digest("base64");

  const response = await fetch(
    `${anprConfig.baseUrl}/C001-servizioNotifica/v1/anpr-service-e002`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${voucher.accessToken}`,
        "Content-Type": "application/json",
        Digest: `SHA-256=${digestHash}`,
      },
      body: requestBody,
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return {
        found: false,
        codiceFiscale: cfUpper,
        idAnpr: null,
        indirizzo: null,
        civico: null,
        cap: null,
        comune: null,
        provincia: null,
        regione: null,
        timestamp: new Date().toISOString(),
      };
    }
    throw new Error(`ANPR C001 verifica residenza failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    listaSoggetti?: Array<{
      idAnpr?: string;
      residenza?: {
        indirizzo?: { descrizione?: string; numeroCivico?: string };
        localita?: {
          cap?: string;
          descrizioneComune?: string;
          sigla_provincia?: string;
        };
      };
    }>;
  };

  const soggetto = data.listaSoggetti?.[0];
  return {
    found: !!soggetto?.residenza,
    codiceFiscale: cfUpper,
    idAnpr: soggetto?.idAnpr || null,
    indirizzo: soggetto?.residenza?.indirizzo?.descrizione || null,
    civico: soggetto?.residenza?.indirizzo?.numeroCivico || null,
    cap: soggetto?.residenza?.localita?.cap || null,
    comune: soggetto?.residenza?.localita?.descrizioneComune || null,
    provincia: soggetto?.residenza?.localita?.sigla_provincia || null,
    regione: null,
    timestamp: new Date().toISOString(),
  };
}
