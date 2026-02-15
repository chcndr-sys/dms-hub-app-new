import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
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

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

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

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // Graceful shutdown: close connections cleanly on restart/stop
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] ${signal} received, shutting down gracefully...`);
    server.close(async () => {
      try {
        const { closeDb } = await import("../db");
        await closeDb();
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
