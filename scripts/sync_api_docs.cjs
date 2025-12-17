#!/usr/bin/env node
/**
 * 🔄 API Documentation Sync Script
 * 
 * OBIETTIVO: Sincronizzare automaticamente index.json con gli endpoint reali del backend
 * RISCHIO: ZERO - Solo lettura codice + scrittura documentazione
 * 
 * COSA FA:
 * 1. Scansiona server/*Router.ts (TRPC procedures)
 * 2. Scansiona server/routes/*.ts (REST endpoints) 
 * 3. Estrae path, metodo, input schema
 * 4. Rigenera MIO-hub/api/index.json
 * 5. Preserva struttura esistente
 * 
 * USO:
 *   node scripts/sync_api_docs.js
 * 
 * OUTPUT:
 *   - MIO-hub/api/index.json (aggiornato)
 *   - scripts/sync_api_docs.log (report)
 */

const fs = require('fs');
const path = require('path');

// ========== CONFIGURAZIONE ==========

const CONFIG = {
  // Path relativi alla root del progetto
  backendDir: path.join(__dirname, '..', 'server'),
  mioHubIndexPath: path.join(__dirname, '..', '..', 'MIO-hub', 'api', 'index.json'),
  logPath: path.join(__dirname, 'sync_api_docs.log'),
  
  // Pattern per identificare file router
  routerFilePattern: /Router\.ts$/,
  routeFilePattern: /\.ts$/,
  
  // Base URL per gli endpoint
  baseUrl: 'https://mihub.157-90-29-66.nip.io',
};

// ========== UTILITY FUNCTIONS ==========

function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(CONFIG.logPath, logMessage + '\n');
}

function readFileSync(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    log(`Errore lettura file ${filePath}: ${err.message}`, 'ERROR');
    return null;
  }
}

function writeFileSync(filePath, content) {
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    log(`File scritto: ${filePath}`, 'SUCCESS');
    return true;
  } catch (err) {
    log(`Errore scrittura file ${filePath}: ${err.message}`, 'ERROR');
    return false;
  }
}

// ========== PARSER TRPC ==========

function parseTRPCRouter(filePath, fileName) {
  const content = readFileSync(filePath);
  if (!content) return [];
  
  const endpoints = [];
  const routerName = fileName.replace('Router.ts', '').replace('routers.ts', 'app');
  
  // Pattern per trovare sub-router: "markets: router({"
  const subrouterRegex = /^\s+(\w+):\s+router\(\{/gm;
  
  // Pattern per trovare procedure: "list: publicProcedure"
  const procedureRegex = /^\s+(\w+):\s+(publicProcedure|protectedProcedure)/gm;
  
  const lines = content.split('\n');
  let currentSubrouter = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Trova sub-router
    const subrouterMatch = line.match(/^\s+(\w+):\s+router\(\{/);
    if (subrouterMatch) {
      currentSubrouter = subrouterMatch[1];
      continue;
    }
    
    // Trova procedure
    const procedureMatch = line.match(/^\s+(\w+):\s+(publicProcedure|protectedProcedure)/);
    if (procedureMatch) {
      const procedureName = procedureMatch[1];
      const procedureType = procedureMatch[2];
      
      // Determina metodo HTTP
      let method = 'GET';
      const nextLines = lines.slice(i, i + 5).join(' ');
      if (nextLines.includes('.mutation')) {
        method = 'POST';
      } else if (nextLines.includes('.query')) {
        method = 'GET';
      }
      
      // Costruisci path
      let path;
      if (currentSubrouter) {
        path = `/api/trpc/${routerName}.${currentSubrouter}.${procedureName}`;
      } else {
        path = `/api/trpc/${routerName}.${procedureName}`;
      }
      
      // Estrai input schema (se presente)
      let inputSchema = null;
      const inputMatch = nextLines.match(/\.input\(z\.object\(\{([^}]+)\}\)\)/);
      if (inputMatch) {
        inputSchema = inputMatch[1].trim();
      }
      
      // Estrai descrizione da commento (se presente)
      let description = '';
      // Cerca nei 5 commenti precedenti, partendo dal più lontano
      // Così troviamo prima la descrizione vera e non le righe decorative
      for (let j = 5; j >= 1; j--) {
        if (i - j < 0) continue;
        const commentLine = lines[i - j].trim();
        if (commentLine.startsWith('//')) {
          const cleanComment = commentLine.replace(/^\/\/\s*/, '').trim();
          // Ignora righe con solo caratteri ripetuti (===, ---, etc)
          if (cleanComment && !/^[=\-_*#]+$/.test(cleanComment)) {
            description = cleanComment;
            break; // Trovata descrizione valida, stop
          }
        }
      }
      
      endpoints.push({
        id: currentSubrouter ? `${currentSubrouter}.${procedureName}` : procedureName,
        method,
        path,
        category: routerName === 'app' ? 'System' : routerName.charAt(0).toUpperCase() + routerName.slice(1),
        description: description || `${procedureName} endpoint`,
        risk_level: method === 'POST' ? 'medium' : 'low',
        require_auth: procedureType === 'protectedProcedure',
        enabled: true,
        test: {
          enabled: method === 'GET',
          default_params: inputSchema ? {} : undefined,
          expected_status: 200
        },
        implemented: 'trpc',
        implementation_note: 'Auto-discovered from backend code',
        router: routerName,
        subrouter: currentSubrouter,
        procedure: procedureName
      });
    }
  }
  
  return endpoints;
}

// ========== PARSER REST ==========

function parseRESTRoutes(filePath, fileName) {
  const content = readFileSync(filePath);
  if (!content) return [];
  
  const endpoints = [];
  
  // Pattern per trovare route REST: app.get('/api/...', ...)
  const routeRegex = /app\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
  
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const path = match[2];
    
    endpoints.push({
      id: path.replace(/[\/:\-]/g, '.').replace(/^\./, ''),
      method,
      path,
      category: 'REST API',
      description: `${method} ${path}`,
      risk_level: method === 'GET' ? 'low' : 'medium',
      require_auth: true,
      enabled: true,
      test: {
        enabled: method === 'GET',
        expected_status: 200
      },
      implemented: 'rest',
      implementation_note: 'Auto-discovered from backend code'
    });
  }
  
  return endpoints;
}

// ========== SCANNER ==========

function scanDirectory(dirPath, filePattern, parser) {
  const endpoints = [];
  
  try {
    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Ricorsione nelle sottocartelle
        endpoints.push(...scanDirectory(filePath, filePattern, parser));
      } else if (filePattern.test(file)) {
        log(`Scansione file: ${file}`);
        const fileEndpoints = parser(filePath, file);
        endpoints.push(...fileEndpoints);
        log(`  → Trovati ${fileEndpoints.length} endpoint`);
      }
    }
  } catch (err) {
    log(`Errore scansione directory ${dirPath}: ${err.message}`, 'ERROR');
  }
  
  return endpoints;
}

// ========== MERGE CON INDEX.JSON ESISTENTE ==========

function mergeWithExistingIndex(newEndpoints, existingIndexPath) {
  let existingData = {
    version: 3,
    last_updated: new Date().toISOString(),
    services: []
  };
  
  // Leggi index.json esistente (se esiste)
  if (fs.existsSync(existingIndexPath)) {
    try {
      const existingContent = fs.readFileSync(existingIndexPath, 'utf8');
      existingData = JSON.parse(existingContent);
      log('Index.json esistente caricato');
    } catch (err) {
      log(`Errore parsing index.json esistente: ${err.message}`, 'WARN');
    }
  } else {
    log('Index.json non trovato, ne creo uno nuovo', 'WARN');
  }
  
  // Trova o crea servizio "dms-hub"
  let dmsHubService = existingData.services.find(s => s.id === 'dms-hub');
  if (!dmsHubService) {
    dmsHubService = {
      id: 'dms-hub',
      display_name: 'DMS HUB API',
      base_url: CONFIG.baseUrl,
      env: 'production',
      description: 'API centralizzate per gestione completa mercati, posteggi, operatori',
      endpoints: []
    };
    existingData.services.push(dmsHubService);
  }
  
  // Crea mappa endpoint esistenti per preservare descrizioni custom
  const existingEndpointsMap = new Map();
  for (const ep of dmsHubService.endpoints) {
    existingEndpointsMap.set(ep.path, ep);
  }
  
  // Merge: preserva descrizioni esistenti, aggiungi nuovi endpoint
  const mergedEndpoints = [];
  const seenPaths = new Set();
  
  for (const newEp of newEndpoints) {
    if (seenPaths.has(newEp.path)) continue;
    seenPaths.add(newEp.path);
    
    const existing = existingEndpointsMap.get(newEp.path);
    if (existing) {
      // Usa nuova descrizione (auto-discovered), fallback a quella esistente
      mergedEndpoints.push({
        ...newEp,
        description: newEp.description || existing.description,
        implementation_note: newEp.implementation_note || existing.implementation_note,
        test: existing.test || newEp.test
      });
    } else {
      // Nuovo endpoint
      mergedEndpoints.push(newEp);
    }
  }
  
  // Ordina per path
  mergedEndpoints.sort((a, b) => a.path.localeCompare(b.path));
  
  dmsHubService.endpoints = mergedEndpoints;
  existingData.last_updated = new Date().toISOString();
  
  return existingData;
}

// ========== MAIN ==========

function main() {
  // Reset log
  if (fs.existsSync(CONFIG.logPath)) {
    fs.unlinkSync(CONFIG.logPath);
  }
  
  log('========================================');
  log('🔄 API Documentation Sync Script');
  log('========================================');
  
  // 1. Scansiona TRPC routers
  log('\n📡 Scansione TRPC Routers...');
  const trpcEndpoints = scanDirectory(
    CONFIG.backendDir,
    CONFIG.routerFilePattern,
    parseTRPCRouter
  );
  log(`✅ Trovati ${trpcEndpoints.length} endpoint TRPC`);
  
  // 2. Scansiona REST routes (se esistono)
  const restRoutesDir = path.join(CONFIG.backendDir, 'routes');
  let restEndpoints = [];
  if (fs.existsSync(restRoutesDir)) {
    log('\n📡 Scansione REST Routes...');
    restEndpoints = scanDirectory(
      restRoutesDir,
      CONFIG.routeFilePattern,
      parseRESTRoutes
    );
    log(`✅ Trovati ${restEndpoints.length} endpoint REST`);
  } else {
    log('\n⚠️  Cartella routes/ non trovata, skip REST');
  }
  
  // 3. Merge tutti gli endpoint
  const allEndpoints = [...trpcEndpoints, ...restEndpoints];
  log(`\n📊 Totale endpoint: ${allEndpoints.length}`);
  
  // 4. Merge con index.json esistente
  log('\n🔀 Merge con index.json esistente...');
  const finalData = mergeWithExistingIndex(allEndpoints, CONFIG.mioHubIndexPath);
  
  // 5. Scrivi index.json
  log('\n💾 Scrittura index.json...');
  const jsonContent = JSON.stringify(finalData, null, 2);
  const success = writeFileSync(CONFIG.mioHubIndexPath, jsonContent);
  
  // 6. Report finale
  log('\n========================================');
  log('📊 REPORT FINALE');
  log('========================================');
  log(`Endpoint TRPC scoperti: ${trpcEndpoints.length}`);
  log(`Endpoint REST scoperti: ${restEndpoints.length}`);
  log(`Totale endpoint: ${allEndpoints.length}`);
  log(`Endpoint in index.json: ${finalData.services[0]?.endpoints.length || 0}`);
  log(`File aggiornato: ${CONFIG.mioHubIndexPath}`);
  log(`Log salvato: ${CONFIG.logPath}`);
  log('========================================');
  
  if (success) {
    log('\n✅ SYNC COMPLETATO CON SUCCESSO!', 'SUCCESS');
    process.exit(0);
  } else {
    log('\n❌ SYNC FALLITO!', 'ERROR');
    process.exit(1);
  }
}

// Esegui
if (require.main === module) {
  main();
}

module.exports = { parseTRPCRouter, parseRESTRoutes, scanDirectory, mergeWithExistingIndex };
