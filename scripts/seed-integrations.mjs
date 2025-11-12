import mysql from 'mysql2/promise';
import 'dotenv/config';

/**
 * Script per popolare database con connessioni esterne predefinite
 */

async function seedIntegrations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  console.log('✅ Connesso al database');

  try {
    // Connessioni esterne predefinite
    const connections = [
      {
        name: 'ARPAE',
        type: 'api',
        endpoint: 'https://api.arpae.it/v1',
        status: 'disconnected',
        healthCheckInterval: 300,
        features: JSON.stringify(['Qualità aria', 'Metriche ambientali', 'Alert inquinamento']),
      },
      {
        name: 'TPER',
        type: 'api',
        endpoint: 'https://api.tper.it/v2',
        status: 'disconnected',
        healthCheckInterval: 300,
        features: JSON.stringify(['Orari bus real-time', 'Fermate vicine', 'Percorsi ottimali']),
      },
      {
        name: 'TPAS',
        type: 'api',
        endpoint: 'https://api.tpas.it/v1',
        status: 'disconnected',
        healthCheckInterval: 300,
        features: JSON.stringify(['App terze', 'Widget esterni', 'Analytics integrazione']),
      },
      {
        name: 'Gestionale Heroku',
        type: 'api',
        endpoint: 'https://lapsy-dms.herokuapp.com/api',
        status: 'pending',
        healthCheckInterval: 600,
        features: JSON.stringify(['Concessioni', 'Pagamenti', 'Documenti', 'Anagrafica']),
      },
    ];

    // Inserisci connessioni (skip se già esistono)
    for (const conn of connections) {
      const [existing] = await connection.execute(
        'SELECT id FROM external_connections WHERE name = ?',
        [conn.name]
      );

      if (existing.length === 0) {
        await connection.execute(
          `INSERT INTO external_connections (name, type, endpoint, status, health_check_interval, features, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [conn.name, conn.type, conn.endpoint, conn.status, conn.healthCheckInterval, conn.features]
        );
        console.log(`✅ Connessione "${conn.name}" creata`);
      } else {
        console.log(`⏭️  Connessione "${conn.name}" già esistente`);
      }
    }

    console.log('\n✅ Seed completato!');
  } catch (error) {
    console.error('❌ Errore durante seed:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

seedIntegrations().catch(console.error);
