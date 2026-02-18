/**
 * E-FIL PagoPA Integration Service
 * 
 * Integrazione con la piattaforma Plug&Pay di E-FIL per il Comune di Grosseto
 * 
 * Componenti E-FIL utilizzati:
 * - WSPayment: Pagamento spontaneo + checkout
 * - WSFeed: Creazione posizione debitoria (avviso)
 * - WSDeliver: Verifica stato pagamento + ricerca giornaliera
 * - WSGeneratorPdf: Generazione avviso/quietanza PDF
 * - WSPaymentNotify: Notifica pagamento "Fuori Nodo"
 * 
 * @see presentazione-PlugPay.pdf per architettura completa
 */

import { createClient, Client } from 'soap';

// ============================================
// TIPI E INTERFACCE
// ============================================

export type Currency = 'EUR';

export interface DebtorInfo {
  fiscalCode?: string;      // Codice Fiscale
  vatNumber?: string;       // Partita IVA
  fullName?: string;        // Ragione Sociale / Nome Cognome
  email?: string;           // Email per ricevuta
  address?: string;         // Indirizzo
  phone?: string;           // Telefono
}

export interface Esito {
  esito: 'OK' | 'KO';
  code?: string;
  message?: string;
}

// === WSPayment: Pagamento spontaneo + checkout ===
export interface PaymentInitRequest {
  applicationCode?: string;
  idGestionale: string;     // ID interno DMS
  iuv?: string;             // Se già generato
  amountCents: number;      // Importo in centesimi
  currency: Currency;
  causale: string;          // Es: "Ricarica Wallet Operatore Mercatale"
  debtor: DebtorInfo;
  returnUrl: string;        // URL ritorno dopo pagamento
  callbackUrl?: string;     // Callback server-to-server
  metadata?: Record<string, string>;
}

export interface PaymentInitResponse extends Esito {
  iuv?: string;
  transactionId?: string;
  redirectUrl?: string;     // URL checkout PagoPA
}

// === WSFeed: Creazione posizione debitoria (avviso) ===
export interface CreatePositionRequest {
  idGestionale: string;
  iuv?: string;
  amountCents: number;
  currency: Currency;
  causale: string;
  debtor: DebtorInfo;
  dueDateISO?: string;      // Data scadenza (YYYY-MM-DD)
  metadata?: Record<string, string>;
}

export interface CreatePositionResponse extends Esito {
  iuv: string;
  codiceAvviso?: string;    // Codice avviso per bollettino
}

// === WSDeliver: Verifica stato + ricerca ===
export interface GetByIuvRequest {
  iuv: string;
}

export interface GetByIuvResponse extends Esito {
  iuv: string;
  stato: 'NON_PAGATA' | 'PAGATA' | 'ANNULLATA' | 'SCADUTA';
  paidAtISO?: string;
  amountCents: number;
  receiptNumber?: string;   // Numero quietanza
}

export interface RicercaPagamentiGiornalieriRequest {
  dateISO: string;          // Data ricerca (YYYY-MM-DD)
  startTime?: string;       // Ora inizio (HH:mm)
  endTime?: string;         // Ora fine (HH:mm)
  page?: number;
}

export interface PagamentoRendicontato {
  iuv: string;
  paidAtISO: string;
  amountCents: number;
  receiptNumber?: string;
}

export interface RicercaPagamentiGiornalieriResponse extends Esito {
  items: PagamentoRendicontato[];
  nextPageToken?: string;
}

// === WSGeneratorPdf: Avviso/Quietanza PDF ===
export interface GeneratorPdfRequest {
  iuv: string;
  type: 'AVVISO' | 'QUIETANZA';
}

export interface GeneratorPdfResponse extends Esito {
  fileName: string;
  contentBase64: string;
}

// === WSPaymentNotify: Pagamento Fuori Nodo ===
export interface PaymentNotifyRequest {
  iuv: string;
  paidAtISO: string;
  channel: string;
  note?: string;
}

export interface PaymentNotifyResponse extends Esito {
  iuv: string;
}

// ============================================
// CONFIGURAZIONE E-FIL
// ============================================

interface EfilConfig {
  baseUrl: string;
  wspaymentWsdl: string;
  wsfeedWsdl: string;
  wsdeliverWsdl: string;
  wsgeneratorpdfWsdl: string;
  wspaymentnotifyWsdl: string;
  username: string;
  password: string;
  applicationCode: string;
  idGestionale: string;
  codiceSegregazione?: string;
  returnUrl: string;
  callbackUrl: string;
}

function getEfilConfig(): EfilConfig {
  const baseUrl = process.env.EFIL_BASE_URL || 'https://test.plugnpay.efil.it/plugnpay';
  
  return {
    baseUrl,
    wspaymentWsdl: process.env.EFIL_WSPAYMENT_WSDL || `${baseUrl}/WSPayment?wsdl`,
    wsfeedWsdl: process.env.EFIL_WSFEED_WSDL || `${baseUrl}/WSFeed?wsdl`,
    wsdeliverWsdl: process.env.EFIL_WSDELIVER_WSDL || `${baseUrl}/WSDeliver?wsdl`,
    wsgeneratorpdfWsdl: process.env.EFIL_WSGENERATORPDF_WSDL || `${baseUrl}/WSGeneratorPdf?wsdl`,
    wspaymentnotifyWsdl: process.env.EFIL_WSPAYMENTNOTIFY_WSDL || `${baseUrl}/WSPaymentNotify?wsdl`,
    username: process.env.EFIL_USERNAME || '',
    password: process.env.EFIL_PASSWORD || '',
    applicationCode: process.env.EFIL_APPLICATION_CODE || '',
    idGestionale: process.env.EFIL_ID_GESTIONALE || 'DMS-GROSSETO',
    codiceSegregazione: process.env.EFIL_CODICE_SEGREGAZIONE,
    returnUrl: process.env.DMS_PAGOPA_RETURN_URL || 'https://miohub.app/payments/return',
    callbackUrl: process.env.DMS_PAGOPA_CALLBACK_URL || 'https://miohub.app/payments/callback',
  };
}

// ============================================
// CLIENT SOAP
// ============================================

async function makeClient(wsdlUrl: string, auth: { user: string; pass: string }): Promise<Client> {
  return new Promise((resolve, reject) => {
    createClient(wsdlUrl, {
      wsdl_options: {
        auth: {
          username: auth.user,
          password: auth.pass,
        },
      },
    }, (err, client) => {
      if (err) {
        console.error('[E-FIL] Errore creazione client SOAP:', err);
        reject(err);
      } else {
        // Imposta autenticazione Basic
        client.setSecurity({
          addOptions: (options: any) => {
            options.auth = {
              user: auth.user,
              pass: auth.pass,
            };
          },
        } as any);
        resolve(client);
      }
    });
  });
}

// ============================================
// FUNZIONI PRINCIPALI
// ============================================

/**
 * Genera un nuovo IUV univoco
 * Formato: AAAA + MM + GG + HHMMSS + 5 random digits
 */
export function generateIUV(): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}${random}`;
}

/**
 * Avvia un pagamento spontaneo (WSPayment)
 * Usato per ricariche wallet immediate con redirect a checkout PagoPA
 */
export async function avviaPagamento(req: PaymentInitRequest): Promise<PaymentInitResponse> {
  const config = getEfilConfig();
  
  // In modalità mock/test, restituisci dati simulati
  if (!config.username || config.username === '<user>') {
    console.log('[E-FIL] Modalità MOCK - Simulazione pagamento');
    const mockIuv = req.iuv || generateIUV();
    return {
      esito: 'OK',
      iuv: mockIuv,
      transactionId: `TXN-${mockIuv}`,
      redirectUrl: `https://checkout.pagopa.it/mock?iuv=${mockIuv}&amount=${req.amountCents}`,
    };
  }
  
  try {
    const client = await makeClient(config.wspaymentWsdl, {
      user: config.username,
      pass: config.password,
    });

    const payload = {
      applicationCode: req.applicationCode || config.applicationCode,
      idGestionale: req.idGestionale || config.idGestionale,
      iuv: req.iuv || generateIUV(),
      importo: (req.amountCents / 100).toFixed(2),
      valuta: req.currency,
      causale: req.causale,
      debitore: {
        codiceFiscale: req.debtor?.fiscalCode,
        partitaIVA: req.debtor?.vatNumber,
        nominativo: req.debtor?.fullName,
        email: req.debtor?.email,
        indirizzo: req.debtor?.address,
      },
      returnUrl: req.returnUrl || config.returnUrl,
      callbackUrl: req.callbackUrl || config.callbackUrl,
      metadati: req.metadata,
    };

    const [res] = await (client as any).WSPaymentAsync(payload);
    
    return {
      esito: res?.esito === 'OK' ? 'OK' : 'KO',
      code: res?.codice,
      message: res?.messaggio,
      iuv: res?.iuv,
      transactionId: res?.transactionId,
      redirectUrl: res?.checkoutUrl,
    };
  } catch (error: any) {
    console.error('[E-FIL] Errore avviaPagamento:', error);
    return {
      esito: 'KO',
      code: 'ERR_PAYMENT',
      message: error.message,
    };
  }
}

/**
 * Crea una posizione debitoria (WSFeed)
 * Usato per generare avvisi PagoPA per ricariche wallet
 */
export async function creaPosizione(req: CreatePositionRequest): Promise<CreatePositionResponse> {
  const config = getEfilConfig();
  
  // In modalità mock/test
  if (!config.username || config.username === '<user>') {
    console.log('[E-FIL] Modalità MOCK - Simulazione creazione posizione');
    const mockIuv = req.iuv || generateIUV();
    return {
      esito: 'OK',
      iuv: mockIuv,
      codiceAvviso: `3${mockIuv.substring(0, 17)}`,
    };
  }
  
  try {
    const client = await makeClient(config.wsfeedWsdl, {
      user: config.username,
      pass: config.password,
    });

    const [res] = await (client as any).WSFeedAsync({
      idGestionale: req.idGestionale || config.idGestionale,
      iuv: req.iuv || generateIUV(),
      importo: (req.amountCents / 100).toFixed(2),
      valuta: req.currency,
      causale: req.causale,
      debitore: {
        codiceFiscale: req.debtor?.fiscalCode,
        nominativo: req.debtor?.fullName,
        email: req.debtor?.email,
      },
      dataScadenza: req.dueDateISO,
    });

    return {
      esito: res?.esito === 'OK' ? 'OK' : 'KO',
      iuv: res?.iuv,
      codiceAvviso: res?.codiceAvviso,
    };
  } catch (error: any) {
    console.error('[E-FIL] Errore creaPosizione:', error);
    return {
      esito: 'KO',
      iuv: '',
      code: 'ERR_POSITION',
      message: error.message,
    };
  }
}

/**
 * Verifica stato pagamento per IUV (WSDeliver)
 */
export async function statoPerIuv(req: GetByIuvRequest): Promise<GetByIuvResponse> {
  const config = getEfilConfig();
  
  // In modalità mock/test
  if (!config.username || config.username === '<user>') {
    console.log('[E-FIL] Modalità MOCK - Simulazione verifica stato');
    return {
      esito: 'OK',
      iuv: req.iuv,
      stato: 'NON_PAGATA',
      amountCents: 0,
    };
  }
  
  try {
    const client = await makeClient(config.wsdeliverWsdl, {
      user: config.username,
      pass: config.password,
    });

    const [res] = await (client as any).WSDeliverAsync({ iuv: req.iuv });
    const amount = res?.importo ? Math.round(parseFloat(res.importo) * 100) : 0;

    return {
      esito: res?.esito === 'OK' ? 'OK' : 'KO',
      iuv: res?.iuv,
      stato: res?.stato,
      paidAtISO: res?.dataPagamento,
      amountCents: amount,
      receiptNumber: res?.numeroQuietanza,
    };
  } catch (error: any) {
    console.error('[E-FIL] Errore statoPerIuv:', error);
    return {
      esito: 'KO',
      iuv: req.iuv,
      stato: 'NON_PAGATA',
      amountCents: 0,
      message: error.message,
    };
  }
}

/**
 * Ricerca pagamenti giornalieri (WSDeliver)
 * Usato dal job cron per allineamento automatico
 */
export async function ricercaPagamentiGiornalieri(
  req: RicercaPagamentiGiornalieriRequest
): Promise<RicercaPagamentiGiornalieriResponse> {
  const config = getEfilConfig();
  
  // In modalità mock/test
  if (!config.username || config.username === '<user>') {
    console.log('[E-FIL] Modalità MOCK - Simulazione ricerca giornaliera');
    return {
      esito: 'OK',
      items: [],
    };
  }
  
  try {
    const client = await makeClient(config.wsdeliverWsdl, {
      user: config.username,
      pass: config.password,
    });

    const [res] = await (client as any).RicercaPagamentiGiornalieriAsync({
      data: req.dateISO,
      oraInizio: req.startTime,
      oraFine: req.endTime,
      page: req.page,
    });

    const items = (res?.pagamenti || []).map((p: any) => ({
      iuv: p.iuv,
      paidAtISO: p.dataPagamento,
      amountCents: Math.round(parseFloat(p.importo) * 100),
      receiptNumber: p.numeroQuietanza,
    }));

    return {
      esito: res?.esito === 'OK' ? 'OK' : 'KO',
      items,
      nextPageToken: res?.nextPageToken,
    };
  } catch (error: any) {
    console.error('[E-FIL] Errore ricercaPagamentiGiornalieri:', error);
    return {
      esito: 'KO',
      items: [],
      message: error.message,
    };
  }
}

/**
 * Genera PDF avviso o quietanza (WSGeneratorPdf)
 */
export async function generaPdf(req: GeneratorPdfRequest): Promise<GeneratorPdfResponse> {
  const config = getEfilConfig();
  
  // In modalità mock/test
  if (!config.username || config.username === '<user>') {
    console.log('[E-FIL] Modalità MOCK - Simulazione generazione PDF');
    return {
      esito: 'OK',
      fileName: `${req.type.toLowerCase()}_${req.iuv}.pdf`,
      contentBase64: '', // PDF vuoto in mock
    };
  }
  
  try {
    const client = await makeClient(config.wsgeneratorpdfWsdl, {
      user: config.username,
      pass: config.password,
    });

    const [res] = await (client as any).WSGeneratorPdfAsync({
      iuv: req.iuv,
      tipologia: req.type,
    });

    return {
      esito: res?.esito === 'OK' ? 'OK' : 'KO',
      fileName: res?.nomeFile || `${req.type.toLowerCase()}_${req.iuv}.pdf`,
      contentBase64: res?.contenuto || '',
    };
  } catch (error: any) {
    console.error('[E-FIL] Errore generaPdf:', error);
    return {
      esito: 'KO',
      fileName: '',
      contentBase64: '',
      message: error.message,
    };
  }
}

/**
 * Notifica pagamento "Fuori Nodo" (WSPaymentNotify)
 * Usato per pagamenti effettuati fuori dal circuito PagoPA
 */
export async function notificaPagamentoFuoriNodo(
  req: PaymentNotifyRequest
): Promise<PaymentNotifyResponse> {
  const config = getEfilConfig();
  
  // In modalità mock/test
  if (!config.username || config.username === '<user>') {
    console.log('[E-FIL] Modalità MOCK - Simulazione notifica fuori nodo');
    return {
      esito: 'OK',
      iuv: req.iuv,
    };
  }
  
  try {
    const client = await makeClient(config.wspaymentnotifyWsdl, {
      user: config.username,
      pass: config.password,
    });

    const [res] = await (client as any).WSPaymentNotifyAsync({
      iuv: req.iuv,
      dataPagamento: req.paidAtISO,
      canale: req.channel,
      note: req.note,
    });

    return {
      esito: res?.esito === 'OK' ? 'OK' : 'KO',
      iuv: res?.iuv || req.iuv,
    };
  } catch (error: any) {
    console.error('[E-FIL] Errore notificaPagamentoFuoriNodo:', error);
    return {
      esito: 'KO',
      iuv: req.iuv,
      message: error.message,
    };
  }
}

// ============================================
// FUNZIONI HELPER PER WALLET DMS
// ============================================

/**
 * Genera avviso PagoPA per ricarica wallet operatore
 */
export async function generaAvvisoRicaricaWallet(params: {
  impresaId: number;
  ragioneSociale: string;
  partitaIva: string;
  codiceFiscale?: string;
  email?: string;
  importoCents: number;
  scadenzaGiorni?: number;
}): Promise<{
  success: boolean;
  iuv?: string;
  codiceAvviso?: string;
  error?: string;
}> {
  const scadenza = new Date();
  scadenza.setDate(scadenza.getDate() + (params.scadenzaGiorni || 30));
  
  const result = await creaPosizione({
    idGestionale: `WALLET-${params.impresaId}-${Date.now()}`,
    amountCents: params.importoCents,
    currency: 'EUR',
    causale: `Ricarica Wallet Operatore Mercatale - ${params.ragioneSociale}`,
    debtor: {
      vatNumber: params.partitaIva,
      fiscalCode: params.codiceFiscale,
      fullName: params.ragioneSociale,
      email: params.email,
    },
    dueDateISO: scadenza.toISOString().split('T')[0],
    metadata: {
      impresaId: params.impresaId.toString(),
      tipo: 'RICARICA_WALLET',
    },
  });
  
  if (result.esito === 'OK') {
    return {
      success: true,
      iuv: result.iuv,
      codiceAvviso: result.codiceAvviso,
    };
  }
  
  return {
    success: false,
    error: result.message || 'Errore generazione avviso',
  };
}

/**
 * Verifica e processa pagamento wallet
 * Chiamato dal callback PagoPA o dal job di allineamento
 */
export async function processaPagamentoWallet(iuv: string): Promise<{
  success: boolean;
  stato: string;
  importoCents?: number;
  error?: string;
}> {
  const result = await statoPerIuv({ iuv });
  
  if (result.esito === 'OK' && result.stato === 'PAGATA') {
    return {
      success: true,
      stato: 'PAGATA',
      importoCents: result.amountCents,
    };
  }
  
  return {
    success: false,
    stato: result.stato || 'ERRORE',
    error: result.message,
  };
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  generateIUV,
  avviaPagamento,
  creaPosizione,
  statoPerIuv,
  ricercaPagamentiGiornalieri,
  generaPdf,
  notificaPagamentoFuoriNodo,
  generaAvvisoRicaricaWallet,
  processaPagamentoWallet,
};
