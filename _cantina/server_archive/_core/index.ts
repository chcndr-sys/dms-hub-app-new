import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "path";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import firebaseAuthRouter from "../firebaseAuthRouter";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { addLog } from "../services/apiLogsService";
import { getDb } from "../db";
import * as schema from "../../drizzle/schema";

/**
 * Salva la metrica API REST nel database per statistiche persistenti
 */
async function saveRestApiMetric(data: {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    
    await db.insert(schema.apiMetrics).values({
      endpoint: data.endpoint,
      method: data.method,
      statusCode: data.statusCode,
      responseTime: data.responseTime,
      errorMessage: data.errorMessage || null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    });
  } catch (error) {
    // Non bloccare la richiesta se il logging fallisce
    console.error('[REST API Metrics] Errore salvataggio metrica:', error);
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy (Vercel, Hetzner reverse proxy)
  app.set("trust proxy", 1);

  // Security headers (Helmet)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://unpkg.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https://mihub.157-90-29-66.nip.io", "https://*.firebaseio.com", "https://*.googleapis.com", "https://orchestratore.mio-hub.me", "https://unpkg.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Necessario per Leaflet tiles
    hsts: { maxAge: 31536000, includeSubDomains: true },
  }));

  // CORS restrittivo
  app.use(cors({
    origin: [
      "https://dms-hub-app-new.vercel.app",
      "https://orchestratore.mio-hub.me",
      "https://mihub.157-90-29-66.nip.io",
      /^http:\/\/localhost:\d+$/,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
  }));

  // Rate limiting globale su API
  app.use("/api/", rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minuti
    max: 300, // max 300 richieste per IP per finestra
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Troppe richieste. Riprova tra qualche minuto." },
  }));

  // Rate limiting strict su auth (anti brute-force)
  app.use("/api/auth/", rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Troppi tentativi di autenticazione. Riprova tra 15 minuti." },
  }));

  app.use("/api/oauth/", rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Troppi tentativi di login. Riprova tra 15 minuti." },
  }));

  // Rate limiting su TCC Security (check-in, QR generation)
  app.use("/api/trpc/tccSecurity.recordCheckin", rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Troppi check-in. Riprova tra qualche minuto." },
  }));

  app.use("/api/trpc/tccSecurity.generateSignedQR", rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Troppi QR generati. Riprova tra qualche minuto." },
  }));

  // Rate limiting su operazioni wallet finanziarie
  app.use("/api/trpc/wallet.ricarica", rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Troppe ricariche. Riprova tra qualche minuto." },
  }));

  app.use("/api/trpc/wallet.decurtazione", rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Troppe decurtazioni. Riprova tra qualche minuto." },
  }));

  // Body parser con limite ragionevole (5MB per JSON, file upload separato)
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ limit: "5mb", extended: true }));

  // 👁️ GLOBAL REST MONITORING MIDDLEWARE - Logs ALL /api/* requests
  app.use("/api", (req, res, next) => {
    const start = Date.now();
    const originalSend = res.send;
    const originalJson = res.json;
    
    // Intercept response to get status code
    const logRequest = (statusCode: number) => {
      const duration = Date.now() - start;
      const userAgent = req.get('user-agent') || 'unknown';
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      
      // Skip logging Guardian and apiStats endpoints to avoid infinite loops
      if (!req.path.includes('/guardian/') && 
          !req.path.includes('/logs/') && 
          !req.path.includes('apiStats') &&
          !req.path.includes('integrations.apiStats')) {
        
        // Log in memoria (per Guardian real-time)
        addLog({
          level: statusCode >= 400 ? 'error' : 'info',
          app: 'REST',
          type: statusCode >= 400 ? 'ERROR' : 'API_CALL',
          endpoint: req.originalUrl,
          method: req.method,
          statusCode,
          responseTime: duration,
          message: `${req.method} ${req.originalUrl} - ${statusCode}`,
          userEmail: 'system', // REST endpoints don't have user context here
          details: {
            userAgent,
            ip,
            query: req.query,
            body: req.method === 'POST' ? '(body hidden)' : undefined,
          },
        });
        
        // Salva nel database (per statistiche persistenti)
        saveRestApiMetric({
          endpoint: req.originalUrl,
          method: req.method,
          statusCode,
          responseTime: duration,
          ipAddress: ip,
          userAgent,
        });
      }
    };
    
    // Override res.send
    res.send = function(data) {
      logRequest(res.statusCode);
      return originalSend.call(this, data);
    };
    
    // Override res.json
    res.json = function(data) {
      logRequest(res.statusCode);
      return originalJson.call(this, data);
    };
    
    next();
  });
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  
  // Firebase Authentication routes (dev locale)
  // NOTA: In produzione, le route /api/auth/* sono gestite da mihub-backend-rest/routes/auth.js su Hetzner
  // Questo router è solo per sviluppo locale
  app.use("/api/auth", firebaseAuthRouter);
  
  // System status endpoints (usati dal frontend useSystemStatus hook)
  app.get("/api/system/health", (_req, res) => {
    res.json({
      status: "online",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: "7.0.0",
    });
  });

  app.get("/api/system/pm2-status", (_req, res) => {
    res.json({
      status: "online",
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage().rss,
      pm2_env: { status: "online" },
    });
  });

  // REST endpoint for Slot Editor v3 import (CORS-enabled)
  app.post("/api/import-from-slot-editor", async (req, res) => {
    try {
      const { slotEditorData } = req.body;
      if (!slotEditorData) {
        return res.status(400).json({ success: false, error: "Missing slotEditorData" });
      }
      
      // Import via TRPC router
      const caller = appRouter.createCaller(await createContext({ req, res, info: {} as any }));
      const result = await caller.dmsHub.markets.importAuto({ slotEditorData });
      
      res.json(result);
    } catch (error: any) {
      console.error("Import error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // ============================================
  // REST Endpoints: DMS Legacy Interoperabilità
  // Proxy da REST → tRPC per compatibilità con documentazione
  // ============================================
  const legacyApiPrefix = "/api/integrations/dms-legacy";

  // EXPORT endpoints (GET)
  const exportEndpoints = ["markets", "vendors", "concessions", "spuntisti", "documents", "stats"] as const;
  for (const endpoint of exportEndpoints) {
    app.get(`${legacyApiPrefix}/${endpoint}`, async (req, res) => {
      try {
        const caller = appRouter.createCaller(await createContext({ req, res, info: {} as any }));
        const result = await (caller.dmsLegacy.export as any)[endpoint]();
        res.json(result);
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  // EXPORT endpoints con parametri
  app.get(`${legacyApiPrefix}/presences/:marketId`, async (req, res) => {
    try {
      const caller = appRouter.createCaller(await createContext({ req, res, info: {} as any }));
      const result = await caller.dmsLegacy.export.presences({ marketId: Number(req.params.marketId) });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get(`${legacyApiPrefix}/market-sessions/:marketId`, async (req, res) => {
    try {
      const caller = appRouter.createCaller(await createContext({ req, res, info: {} as any }));
      const result = await caller.dmsLegacy.export.marketSessions({ marketId: Number(req.params.marketId) });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get(`${legacyApiPrefix}/stalls/:marketId`, async (req, res) => {
    try {
      const caller = appRouter.createCaller(await createContext({ req, res, info: {} as any }));
      const result = await caller.dmsLegacy.export.stalls({ marketId: Number(req.params.marketId) });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // UTILITY endpoints
  app.get(`${legacyApiPrefix}/health`, async (req, res) => {
    try {
      const caller = appRouter.createCaller(await createContext({ req, res, info: {} as any }));
      const result = await caller.dmsLegacy.health();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get(`${legacyApiPrefix}/status`, async (req, res) => {
    try {
      const caller = appRouter.createCaller(await createContext({ req, res, info: {} as any }));
      const result = await caller.dmsLegacy.status();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post(`${legacyApiPrefix}/sync`, async (req, res) => {
    try {
      const caller = appRouter.createCaller(await createContext({ req, res, info: {} as any }));
      const result = await caller.dmsLegacy.sync(req.body || undefined);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post(`${legacyApiPrefix}/cron-sync`, async (req, res) => {
    try {
      const caller = appRouter.createCaller(await createContext({ req, res, info: {} as any }));
      const result = await caller.dmsLegacy.cronSync();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    // Serve static files with specific cache control
    // 1. Assets with hash in filename -> Cache forever
    app.use("/assets", express.static(path.resolve(import.meta.dirname, "../public/assets"), {
      maxAge: "1y",
      immutable: true
    }));

    // 2. Everything else (including index.html) -> No Cache
    app.use(express.static(path.resolve(import.meta.dirname, "../public"), {
      setHeaders: (res, path) => {
        if (path.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        }
      }
    }));

    // Fallback for SPA routing: serve index.html for unknown routes
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.sendFile(path.resolve(import.meta.dirname, "../public/index.html"));
    });
  }

  const port = parseInt(process.env.PORT || "3000");

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // ============================================
  // DMS Legacy CRON Sync — ogni 5 minuti (configurabile)
  // ============================================
  let cronSyncInterval: ReturnType<typeof setInterval> | null = null;

  async function startLegacyCronSync() {
    try {
      const { isLegacyConfigured } = await import("../services/dmsLegacyService");
      if (!isLegacyConfigured()) {
        console.log("[DMS Legacy CRON] Legacy DB non configurato — CRON sync disabilitata");
        return;
      }

      const db = await getDb();
      if (!db) return;

      // Leggi frequenza dalla config
      const [config] = await db.select().from(schema.syncConfig).limit(1);
      const frequency = (config?.frequency || 300) * 1000; // Default 5 min in ms

      if (config && config.enabled !== 1) {
        console.log("[DMS Legacy CRON] Sync automatica disabilitata nella configurazione");
        return;
      }

      cronSyncInterval = setInterval(async () => {
        try {
          const caller = appRouter.createCaller(await createContext({ req: {} as any, res: {} as any, info: {} as any }));
          await caller.dmsLegacy.cronSync();
          console.log(`[DMS Legacy CRON] Sync completata — prossima in ${frequency / 1000}s`);
        } catch (error: any) {
          console.error("[DMS Legacy CRON] Errore:", error.message);
        }
      }, frequency);

      console.log(`[DMS Legacy CRON] Sync automatica avviata — ogni ${frequency / 1000}s`);
    } catch (error: any) {
      console.error("[DMS Legacy CRON] Errore avvio:", error.message);
    }
  }

  // Avvia CRON dopo 10s per dare tempo al server di stabilizzarsi
  setTimeout(startLegacyCronSync, 10000);

  // Graceful shutdown: close connections cleanly on restart/stop
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] ${signal} received, shutting down gracefully...`);
    if (cronSyncInterval) clearInterval(cronSyncInterval);
    server.close(async () => {
      try {
        const { closeDb } = await import("../db");
        await closeDb();
        const { closeLegacyDb } = await import("../services/dmsLegacyService");
        await closeLegacyDb();
        console.log("[Server] Database connections closed.");
      } catch {}
      process.exit(0);
    });
    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
      console.error("[Server] Forced shutdown after timeout.");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch(console.error);
