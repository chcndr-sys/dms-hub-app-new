/**
 * AppIO Service — Notifiche tramite App IO
 *
 * Implementazione conforme alle specifiche ufficiali App IO (2025):
 * - Base URL: https://api.io.pagopa.it/api/v1/ (produzione, unico ambiente)
 * - Auth: Ocp-Apim-Subscription-Key (Service Key per invio, Manage Key per gestione)
 * - Ogni service ha 2 chiavi (primary + secondary) per rotazione senza downtime
 *
 * Vincoli ufficiali sui messaggi:
 * - subject: min 10, max 120 caratteri
 * - markdown: min 80, max 10.000 caratteri
 * - time_to_live: min 3600 (1h), max 604800 (7gg), default 3600
 * - payment_data.amount: in centesimi (15000 = 150,00 EUR)
 * - payment_data.notice_number: 18 cifre, pattern ^[0123][0-9]{17}$
 *
 * OBBLIGATORIO prima di inviare un messaggio:
 * 1. Chiamare getProfile(fiscalCode)
 * 2. Verificare sender_allowed === true
 * Se 404 o sender_allowed === false, NON inviare.
 *
 * CF di test (unico funzionante in modalita' trial): AAAAAA00A00A000A
 * In trial i messaggi arrivano come email, non come push notification.
 *
 * Developer Portal: selfcare.pagopa.it (Area Riservata)
 * Legacy portal: developer.io.italia.it (deprecato, chiude sett. 2025)
 */

const APPIO_API_KEY = process.env.APPIO_API_KEY || "";
const APPIO_BASE_URL =
  process.env.APPIO_BASE_URL || "https://api.io.pagopa.it/api/v1";
const APPIO_MOCK_MODE = process.env.APPIO_MOCK_MODE !== "false"; // default true

// CF di test ufficiale App IO (funziona in modalita' trial)
export const APPIO_TEST_FISCAL_CODE = "AAAAAA00A00A000A";

// ============================================
// Template messaggi
// ============================================

export interface MessageTemplate {
  id: string;
  name: string;
  subject: string;
  markdownBody: string;
  requiredParams: string[];
  hasPayment: boolean; // Se il template include dati PagoPA
}

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    id: "scadenza_concessione",
    name: "Scadenza Concessione",
    subject: "Scadenza concessione mercato ambulante",
    markdownBody:
      "Gentile operatore,\n\nLa sua concessione per il mercato **{nome}** scade il **{data}**.\n\n" +
      "La invitiamo a procedere con il rinnovo presso lo sportello competente o tramite il portale DMS Hub.\n\n" +
      "Per informazioni: ufficio.mercati@comune.{comune}.it\n\nCordiali saluti,\nComune di {comune}",
    requiredParams: ["nome", "data", "comune"],
    hasPayment: false,
  },
  {
    id: "avviso_pagamento",
    name: "Avviso di Pagamento PagoPA — COSAP",
    subject: "Nuovo avviso di pagamento COSAP mercato",
    markdownBody:
      "Gentile operatore,\n\nE' stato emesso un nuovo avviso di pagamento PagoPA per il canone di occupazione suolo pubblico (COSAP).\n\n" +
      "**Importo**: {importo} EUR\n**Causale**: {causale}\n**Scadenza**: {scadenza}\n\n" +
      "Puo' procedere al pagamento direttamente dall'app IO o tramite i punti di pagamento PagoPA abilitati.\n\n" +
      "Cordiali saluti,\nComune di {comune}",
    requiredParams: ["importo", "causale", "scadenza", "comune"],
    hasPayment: true,
  },
  {
    id: "verbale_emesso",
    name: "Verbale di Contestazione",
    subject: "Verbale di contestazione emesso — mercato",
    markdownBody:
      "Gentile operatore,\n\nE' stato emesso un verbale di contestazione n. **{numero}** in data {data}.\n\n" +
      "**Motivo**: {motivo}\n\n" +
      "Puo' consultare i dettagli e presentare eventuali controdeduzioni tramite il portale DMS Hub entro 30 giorni dalla notifica.\n\n" +
      "Cordiali saluti,\nPolizia Municipale - Comune di {comune}",
    requiredParams: ["numero", "data", "motivo", "comune"],
    hasPayment: false,
  },
  {
    id: "conferma_prenotazione",
    name: "Conferma Prenotazione Posteggio",
    subject: "Prenotazione posteggio confermata — mercato",
    markdownBody:
      "Gentile operatore,\n\nLa sua prenotazione e' stata confermata.\n\n" +
      "**Posteggio**: {codice}\n**Data**: {data}\n**Mercato**: {mercato}\n\n" +
      "Si prega di presentarsi entro le ore 07:00 del giorno indicato con tutta la documentazione in regola.\n\n" +
      "Cordiali saluti,\nComune di {comune}",
    requiredParams: ["codice", "data", "mercato", "comune"],
    hasPayment: false,
  },
];

// ============================================
// Tipi
// ============================================

interface AppIoMessageResult {
  sent: boolean;
  messageId: string | null;
  fiscalCode: string;
  templateId: string;
  status: "ACCEPTED" | "THROTTLED" | "REJECTED" | "FAILED";
  timestamp: string;
}

interface AppIoProfile {
  fiscalCode: string;
  senderAllowed: boolean; // OBBLIGATORIO verificare prima di inviare
  preferredLanguages: string[];
  timestamp: string;
}

interface AppIoStatus {
  connected: boolean;
  mode: "mock" | "live";
  baseUrl: string;
  hasApiKey: boolean;
  templatesCount: number;
  testFiscalCode: string;
  timestamp: string;
}

// ============================================
// Funzioni
// ============================================

/**
 * Applica i parametri al template markdown.
 * Verifica i vincoli ufficiali: subject 10-120 char, markdown 80-10000 char.
 */
function applyTemplate(
  template: MessageTemplate,
  params: Record<string, string>
): { subject: string; markdown: string } {
  let markdown = template.markdownBody;
  let subject = template.subject;

  for (const [key, value] of Object.entries(params)) {
    const placeholder = `{${key}}`;
    markdown = markdown.replaceAll(placeholder, value);
    subject = subject.replaceAll(placeholder, value);
  }

  // Vincoli ufficiali App IO
  if (subject.length < 10) {
    subject = subject.padEnd(10, " ");
  }
  if (subject.length > 120) {
    subject = subject.substring(0, 117) + "...";
  }
  if (markdown.length < 80) {
    markdown = markdown + "\n\n---\nMessaggio inviato tramite DMS Hub.";
  }
  if (markdown.length > 10000) {
    markdown = markdown.substring(0, 9997) + "...";
  }

  return { subject, markdown };
}

/**
 * Verifica se un cittadino ha App IO attiva e ha abilitato il servizio.
 *
 * OBBLIGATORIO chiamare PRIMA di inviare qualsiasi messaggio.
 * Se sender_allowed === false o 404 → NON inviare.
 *
 * Endpoint: GET /api/v1/profiles/{fiscal_code}
 */
export async function getProfile(
  fiscalCode: string
): Promise<AppIoProfile> {
  const cf = fiscalCode.toUpperCase().trim();

  if (APPIO_MOCK_MODE) {
    // Mock: il CF di test e' sempre attivo, ~80% degli altri lo sono
    const isTestCf = cf === APPIO_TEST_FISCAL_CODE;
    const hasAppIo = isTestCf || cf.charCodeAt(0) % 5 !== 0;
    return {
      fiscalCode: cf,
      senderAllowed: hasAppIo,
      preferredLanguages: ["it_IT"],
      timestamp: new Date().toISOString(),
    };
  }

  const response = await fetch(`${APPIO_BASE_URL}/profiles/${cf}`, {
    headers: {
      "Ocp-Apim-Subscription-Key": APPIO_API_KEY,
    },
  });

  if (response.status === 404) {
    return {
      fiscalCode: cf,
      senderAllowed: false,
      preferredLanguages: [],
      timestamp: new Date().toISOString(),
    };
  }

  if (!response.ok) {
    throw new Error(`AppIO get profile failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    sender_allowed: boolean;
    preferred_languages?: string[];
  };

  return {
    fiscalCode: cf,
    senderAllowed: data.sender_allowed,
    preferredLanguages: data.preferred_languages || ["it_IT"],
    timestamp: new Date().toISOString(),
  };
}

/**
 * Invia un messaggio a un cittadino tramite App IO.
 *
 * Endpoint: POST /api/v1/messages (con fiscal_code nel body — metodo preferito)
 *
 * Body conforme: { fiscal_code, time_to_live, content: { subject, markdown, due_date?, payment_data? } }
 */
export async function sendMessage(
  fiscalCode: string,
  subject: string,
  markdown: string,
  options?: {
    timeToLive?: number; // secondi, min 3600, max 604800
    dueDate?: string; // ISO 8601 UTC, es. "2026-02-28T22:59:59.000Z"
    paymentData?: {
      amount: number; // centesimi
      noticeNumber: string; // 18 cifre, pattern ^[0123][0-9]{17}$
      invalidAfterDueDate?: boolean;
      payeeFiscalCode?: string; // CF ente creditore (11 cifre)
    };
  }
): Promise<AppIoMessageResult> {
  const cf = fiscalCode.toUpperCase().trim();

  if (APPIO_MOCK_MODE) {
    return {
      sent: true,
      messageId: `mock_msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      fiscalCode: cf,
      templateId: "custom",
      status: "ACCEPTED",
      timestamp: new Date().toISOString(),
    };
  }

  // Costruisci il body conforme alle specifiche
  const body: Record<string, unknown> = {
    fiscal_code: cf,
    time_to_live: Math.max(3600, Math.min(options?.timeToLive ?? 3600, 604800)),
    content: {
      subject: subject.substring(0, 120),
      markdown,
    },
  };

  // Due date (opzionale)
  if (options?.dueDate) {
    (body.content as Record<string, unknown>).due_date = options.dueDate;
  }

  // Payment data PagoPA (opzionale)
  if (options?.paymentData) {
    (body.content as Record<string, unknown>).payment_data = {
      amount: options.paymentData.amount,
      notice_number: options.paymentData.noticeNumber,
      invalid_after_due_date:
        options.paymentData.invalidAfterDueDate ?? false,
      ...(options.paymentData.payeeFiscalCode && {
        payee: { fiscal_code: options.paymentData.payeeFiscalCode },
      }),
    };
  }

  const response = await fetch(`${APPIO_BASE_URL}/messages`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": APPIO_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `AppIO send message failed: ${response.status} ${response.statusText} — ${errorBody}`
    );
  }

  const data = (await response.json()) as { id: string };

  return {
    sent: true,
    messageId: data.id,
    fiscalCode: cf,
    templateId: "custom",
    status: "ACCEPTED",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Invia un messaggio usando un template predefinito.
 * Verifica automaticamente i parametri richiesti.
 */
export async function sendTemplateMessage(
  fiscalCode: string,
  templateId: string,
  params: Record<string, string>
): Promise<AppIoMessageResult> {
  const template = MESSAGE_TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    throw new Error(`Template non trovato: ${templateId}`);
  }

  // Verifica parametri richiesti
  for (const requiredParam of template.requiredParams) {
    if (!params[requiredParam]) {
      throw new Error(
        `Parametro mancante per template ${templateId}: ${requiredParam}`
      );
    }
  }

  const { subject, markdown } = applyTemplate(template, params);
  const result = await sendMessage(fiscalCode, subject, markdown);
  return { ...result, templateId };
}

/**
 * Stato connessione App IO.
 */
export async function getStatus(): Promise<AppIoStatus> {
  if (APPIO_MOCK_MODE) {
    return {
      connected: true,
      mode: "mock",
      baseUrl: APPIO_BASE_URL,
      hasApiKey: !!APPIO_API_KEY,
      templatesCount: MESSAGE_TEMPLATES.length,
      testFiscalCode: APPIO_TEST_FISCAL_CODE,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    // Verifica connettivita' con profilo di test
    const response = await fetch(
      `${APPIO_BASE_URL}/profiles/${APPIO_TEST_FISCAL_CODE}`,
      {
        headers: { "Ocp-Apim-Subscription-Key": APPIO_API_KEY },
      }
    );

    return {
      connected: response.ok || response.status === 404,
      mode: "live",
      baseUrl: APPIO_BASE_URL,
      hasApiKey: !!APPIO_API_KEY,
      templatesCount: MESSAGE_TEMPLATES.length,
      testFiscalCode: APPIO_TEST_FISCAL_CODE,
      timestamp: new Date().toISOString(),
    };
  } catch {
    return {
      connected: false,
      mode: "live",
      baseUrl: APPIO_BASE_URL,
      hasApiKey: !!APPIO_API_KEY,
      templatesCount: MESSAGE_TEMPLATES.length,
      testFiscalCode: APPIO_TEST_FISCAL_CODE,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Lista template messaggi disponibili.
 */
export function listTemplates(): MessageTemplate[] {
  return MESSAGE_TEMPLATES;
}
