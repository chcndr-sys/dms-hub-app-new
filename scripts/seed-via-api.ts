import { getDb } from "../server/db";
import * as schema from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function seedIntegrations() {
  const db = await getDb();
  if (!db) {
    console.error("Database non disponibile");
    return;
  }

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
      status: 'connected',
      healthCheckInterval: 300,
      features: JSON.stringify(['Orari bus real-time', 'Fermate vicine', 'Percorsi ottimali', 'Dati mobilità integrati']),
    },
    {
      name: 'Centro Mobilità',
      type: 'api',
      endpoint: 'https://api.centromobilita.it/v1',
      status: 'connected',
      healthCheckInterval: 300,
      features: JSON.stringify(['Traffico real-time', 'Parcheggi disponibili', 'Zone ZTL', 'Incidenti e lavori']),
    },
    {
      name: 'Centro Mobilità Nazionale',
      type: 'api',
      endpoint: 'https://api.mobilitanazionale.it/v1',
      status: 'connected',
      healthCheckInterval: 300,
      features: JSON.stringify(['Dati mobilità nazionale', 'Statistiche trasporti', 'Integrazione TPL', 'Open Data']),
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

  for (const conn of connections) {
    try {
      // Verifica se esiste già
      const [existing] = await db.select()
        .from(schema.externalConnections)
        .where(eq(schema.externalConnections.name, conn.name))
        .limit(1);
      
      if (existing) {
        // Aggiorna se esiste
        await db.update(schema.externalConnections)
          .set({
            status: conn.status,
            features: conn.features,
            lastSyncAt: (conn.status === 'connected') ? new Date() : null,
          })
          .where(eq(schema.externalConnections.name, conn.name));
        console.log(`🔄 Connessione "${conn.name}" aggiornata (status: ${conn.status})`);
      } else {
        // Inserisci nuovo
        const [result] = await db.insert(schema.externalConnections).values({
          ...conn,
          lastSyncAt: (conn.status === 'connected') ? new Date() : null,
        });
        console.log(`✅ Connessione "${conn.name}" creata (ID: ${result.insertId}, status: ${conn.status})`);
      }
    } catch (error: any) {
      console.error(`❌ Errore per "${conn.name}":`, error.message);
    }
  }

  console.log('\n✅ Seed completato!');
}

seedIntegrations();
