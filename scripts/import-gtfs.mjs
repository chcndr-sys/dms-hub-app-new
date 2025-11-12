#!/usr/bin/env node
/**
 * Script Universale Import GTFS
 * 
 * Scarica e importa dati GTFS (Google Transit Feed Specification) da qualsiasi città italiana
 * nel database mobility_data senza modificare i dati esistenti.
 * 
 * Uso:
 *   node scripts/import-gtfs.mjs <city_name> <gtfs_zip_url>
 * 
 * Esempio:
 *   node scripts/import-gtfs.mjs Milano https://dati.comune.milano.it/dataset/ds634_tpl_gtfs/resource/gtfs.zip
 *   node scripts/import-gtfs.mjs Genova https://opendata.regione.liguria.it/dataset/amt-genova-gtfs/resource/gtfs_amt.zip
 * 
 * Formato GTFS Standard:
 *   - stops.txt: Fermate (stop_id, stop_name, stop_lat, stop_lon)
 *   - routes.txt: Linee (route_id, route_short_name, route_long_name, route_type)
 *   - stop_times.txt: Orari (trip_id, stop_id, arrival_time, departure_time)
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createWriteStream, createReadStream } from 'fs';
import { pipeline } from 'stream/promises';
import { parse } from 'csv-parse';
import AdmZip from 'adm-zip';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurazione database (usa variabili ambiente)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dms_app',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

const { Pool } = pg;
const pool = new Pool(dbConfig);

// Mapping route_type GTFS → nostro type
const ROUTE_TYPE_MAP = {
  0: 'tram',      // Tram, Streetcar, Light rail
  1: 'metro',     // Subway, Metro
  2: 'train',     // Rail
  3: 'bus',       // Bus
  4: 'ferry',     // Ferry
  5: 'cablecar',  // Cable tram
  6: 'gondola',   // Aerial lift, suspended cable car
  7: 'funicular', // Funicular
  11: 'trolleybus', // Trolleybus
  12: 'monorail'  // Monorail
};

/**
 * Download file da URL
 */
async function downloadFile(url, dest) {
  console.log(`📥 Downloading ${url}...`);
  
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = createWriteStream(dest);
    
    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Redirect
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded to ${dest}`);
        resolve(dest);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

/**
 * Estrai ZIP
 */
async function extractZip(zipPath, extractDir) {
  console.log(`📦 Extracting ${zipPath}...`);
  
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractDir, true);
  
  console.log(`✅ Extracted to ${extractDir}`);
  return extractDir;
}

/**
 * Parse CSV file
 */
async function parseCSV(filePath) {
  const records = [];
  const parser = createReadStream(filePath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true
    })
  );
  
  for await (const record of parser) {
    records.push(record);
  }
  
  return records;
}

/**
 * Import stops.txt → mobility_data
 */
async function importStops(stopsFile, routesFile, cityName) {
  console.log(`\n🚏 Importing stops from ${stopsFile}...`);
  
  const stops = await parseCSV(stopsFile);
  const routes = await parseCSV(routesFile);
  
  // Crea mappa route_id → route info
  const routeMap = new Map();
  routes.forEach(route => {
    routeMap.set(route.route_id, {
      shortName: route.route_short_name || route.route_id,
      longName: route.route_long_name || '',
      type: ROUTE_TYPE_MAP[parseInt(route.route_type)] || 'bus'
    });
  });
  
  let inserted = 0;
  let skipped = 0;
  
  for (const stop of stops) {
    try {
      // Trova la route principale per questa fermata (semplificazione)
      const routeInfo = routeMap.values().next().value || { shortName: '1', longName: cityName, type: 'bus' };
      
      const result = await pool.query(`
        INSERT INTO mobility_data (
          type, 
          stop_name, 
          line_number, 
          line_name,
          lat, 
          lng, 
          next_arrival, 
          occupancy, 
          status,
          city
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [
        routeInfo.type,
        stop.stop_name,
        routeInfo.shortName,
        routeInfo.longName || cityName,
        parseFloat(stop.stop_lat),
        parseFloat(stop.stop_lon),
        `${Math.floor(Math.random() * 15) + 1} min`, // Mock next arrival
        Math.floor(Math.random() * 100), // Mock occupancy
        Math.random() > 0.2 ? 'active' : 'delayed', // Mock status
        cityName
      ]);
      
      if (result.rowCount > 0) {
        inserted++;
      } else {
        skipped++;
      }
      
      if (inserted % 50 === 0) {
        console.log(`  ✓ Inserted ${inserted} stops...`);
      }
    } catch (err) {
      console.error(`  ✗ Error inserting stop ${stop.stop_name}:`, err.message);
    }
  }
  
  console.log(`\n✅ Import complete:`);
  console.log(`   - Inserted: ${inserted} stops`);
  console.log(`   - Skipped: ${skipped} (duplicates)`);
  
  return { inserted, skipped };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error(`
Usage: node scripts/import-gtfs.mjs <city_name> <gtfs_zip_url>

Example:
  node scripts/import-gtfs.mjs Milano https://dati.comune.milano.it/gtfs.zip
  node scripts/import-gtfs.mjs Genova https://opendata.regione.liguria.it/gtfs_amt.zip

Available GTFS datasets:
  - Milano AMAT: https://dati.comune.milano.it/dataset/ds634_tpl_gtfs
  - Genova AMT: https://opendata.regione.liguria.it/dataset/amt-genova-gtfs
  - Roma ATAC: https://romamobilita.it/it/azienda/open-data/gtfs
  - Torino GTT: https://opendata.5t.torino.it/gtfs
    `);
    process.exit(1);
  }
  
  const [cityName, gtfsUrl] = args;
  const tempDir = path.join(__dirname, '../.temp');
  const zipPath = path.join(tempDir, `gtfs_${cityName}.zip`);
  const extractDir = path.join(tempDir, `gtfs_${cityName}`);
  
  try {
    // Crea directory temporanea
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    console.log(`\n🌍 GTFS Import Tool - ${cityName}\n`);
    
    // 1. Download GTFS ZIP
    await downloadFile(gtfsUrl, zipPath);
    
    // 2. Extract ZIP
    await extractZip(zipPath, extractDir);
    
    // 3. Verifica file GTFS
    const stopsFile = path.join(extractDir, 'stops.txt');
    const routesFile = path.join(extractDir, 'routes.txt');
    
    if (!fs.existsSync(stopsFile)) {
      throw new Error('stops.txt not found in GTFS archive');
    }
    if (!fs.existsSync(routesFile)) {
      throw new Error('routes.txt not found in GTFS archive');
    }
    
    // 4. Import stops
    const stats = await importStops(stopsFile, routesFile, cityName);
    
    // 5. Cleanup
    console.log(`\n🧹 Cleaning up temporary files...`);
    fs.rmSync(tempDir, { recursive: true, force: true });
    
    console.log(`\n🎉 Import completed successfully!`);
    console.log(`   City: ${cityName}`);
    console.log(`   Stops imported: ${stats.inserted}`);
    
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
