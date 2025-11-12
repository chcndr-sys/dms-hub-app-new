import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../drizzle/schema";

const db = drizzle(process.env.DATABASE_URL!);

async function seed() {
  console.log("🌱 Starting seed (minimal for testing)...");

  // 1. Seed carbon_credits_config
  console.log("Creating carbon credits config...");
  await db.insert(schema.carbonCreditsConfig).values({
    baseValue: 150, // €1.50
    areaBoosts: JSON.stringify({
      "Grosseto": 0,
      "Follonica": -10,
      "Orbetello": 5
    }),
    categoryBoosts: JSON.stringify({
      "BIO": 20,
      "KM0": 15,
      "DOP": 10
    }),
    updatedBy: "system",
  });

  // 2. Seed markets (5 mercati)
  console.log("Creating 5 markets...");
  const marketData = [
    { name: "Mercato Coperto Grosseto", city: "Grosseto", lat: "42.7606", lng: "11.1133" },
    { name: "Mercato Follonica", city: "Follonica", lat: "42.9258", lng: "10.7594" },
    { name: "Mercato Orbetello", city: "Orbetello", lat: "42.4419", lng: "11.2169" },
    { name: "Mercato Castiglione", city: "Castiglione", lat: "42.7667", lng: "10.8833" },
    { name: "Mercato Marina", city: "Grosseto", lat: "42.7333", lng: "10.9833" },
  ];

  for (const market of marketData) {
    await db.insert(schema.markets).values({
      ...market,
      address: `Via del Mercato, ${market.city}`,
      openingHours: JSON.stringify({"tue": "8-13", "thu": "8-13", "sat": "8-14"}),
      active: 1,
    });
  }

  // 3. Seed shops (10 negozi)
  console.log("Creating 10 shops...");
  const categories = ["BIO", "KM0", "DOP", "standard"];
  const shopTypes = ["Frutta", "Verdura", "Salumeria", "Formaggi", "Pane", "Pesce", "Carne", "Olio", "Vino", "Miele"];

  for (let i = 1; i <= 10; i++) {
    const marketId = ((i - 1) % 5) + 1;
    const category = categories[i % categories.length];
    const shopType = shopTypes[i - 1];
    
    const certs = [];
    if (category === "BIO") certs.push("BIO");
    if (category === "KM0") certs.push("KM0");
    if (category === "DOP") certs.push("DOP");

    await db.insert(schema.shops).values({
      marketId,
      name: `${shopType} ${i}`,
      category,
      certifications: JSON.stringify(certs),
      pendingReimbursement: Math.floor(Math.random() * 200),
      totalReimbursed: Math.floor(Math.random() * 1000),
      bankAccount: `IT${String(i).padStart(2, '0')}X1234567890`,
    });
  }

  // 4. Seed users (20 utenti)
  console.log("Creating 20 users...");
  for (let i = 1; i <= 20; i++) {
    await db.insert(schema.users).values({
      openId: `test_user_${i}`,
      name: `Utente ${i}`,
      email: `user${i}@test.com`,
      loginMethod: "email",
      role: i === 1 ? "admin" : "user",
    });

    await db.insert(schema.extendedUsers).values({
      userId: i,
      walletBalance: Math.floor(Math.random() * 200),
      sustainabilityRating: Math.floor(Math.random() * 100),
      transportPreference: ["bike", "car", "bus", "walk"][i % 4],
      phone: `+39 ${String(3000000000 + i)}`,
    });
  }

  // 5. Seed transactions (50)
  console.log("Creating 50 transactions...");
  for (let i = 1; i <= 50; i++) {
    await db.insert(schema.transactions).values({
      userId: (i % 20) + 1,
      shopId: (i % 10) + 1,
      type: ["earn", "spend", "refund"][i % 3],
      amount: Math.floor(Math.random() * 30) + 10,
      euroValue: (Math.floor(Math.random() * 30) + 10) * 150,
      description: `Transaction ${i}`,
    });
  }

  // 6. Seed checkins (30)
  console.log("Creating 30 checkins...");
  for (let i = 1; i <= 30; i++) {
    const transport = ["bike", "walk", "bus", "car"][i % 4];
    const carbonSaved = transport === "bike" ? 2500 : transport === "walk" ? 3000 : transport === "bus" ? 1500 : 500;

    await db.insert(schema.checkins).values({
      userId: (i % 20) + 1,
      marketId: (i % 5) + 1,
      transport,
      lat: `42.${7000 + (i * 10)}`,
      lng: `11.${1000 + (i * 10)}`,
      carbonSaved,
    });
  }

  // 7. Seed fund_transactions (10)
  console.log("Creating 10 fund transactions...");
  const sources = ["Regione Toscana", "Comune Grosseto", "Sponsor", "Rimborsi"];
  for (let i = 1; i <= 10; i++) {
    await db.insert(schema.fundTransactions).values({
      type: i % 2 === 0 ? "income" : "expense",
      source: sources[i % sources.length],
      amount: Math.floor(Math.random() * 30000) + 10000,
      description: `Fund transaction ${i}`,
    });
  }

  // 8. Seed reimbursements (5)
  console.log("Creating 5 reimbursements...");
  for (let i = 1; i <= 5; i++) {
    const credits = Math.floor(Math.random() * 200) + 50;
    await db.insert(schema.reimbursements).values({
      shopId: i,
      credits,
      euros: credits * 150,
      status: i % 2 === 0 ? "processed" : "pending",
      batchId: i % 2 === 0 ? `BATCH_${i}` : null,
      processedAt: i % 2 === 0 ? new Date() : null,
    });
  }

  // 9. Seed civic_reports (10)
  console.log("Creating 10 civic reports...");
  const reportTypes = ["Rifiuti", "Illuminazione", "Strade", "Verde", "Altro"];
  for (let i = 1; i <= 10; i++) {
    await db.insert(schema.civicReports).values({
      userId: (i % 20) + 1,
      type: reportTypes[i % reportTypes.length],
      description: `Segnalazione ${i}`,
      lat: `42.${7000 + (i * 20)}`,
      lng: `11.${1000 + (i * 20)}`,
      photoUrl: i % 2 === 0 ? `https://example.com/photo${i}.jpg` : null,
      status: i % 3 === 0 ? "resolved" : "pending",
    });
  }

  // 10. Seed products (20)
  console.log("Creating 20 products...");
  const productNames = ["Pomodori", "Mele", "Pecorino", "Pane", "Olio", "Vino", "Miele", "Salame", "Prosciutto", "Pasta"];
  for (let i = 1; i <= 20; i++) {
    await db.insert(schema.products).values({
      shopId: ((i - 1) % 10) + 1,
      name: `${productNames[i % productNames.length]} ${i}`,
      category: ["Frutta", "Verdura", "Latticini", "Salumi", "Altro"][i % 5],
      certifications: JSON.stringify([["BIO"], ["KM0"], ["DOP"]][i % 3]),
      price: Math.floor(Math.random() * 1500) + 500,
    });
  }

  // 11. Seed product_tracking (10 - TPAS)
  console.log("Creating 10 product tracking (TPAS)...");
  const countries = ["ITA", "FRA", "ESP"];
  const modes = ["local", "truck", "sea"];
  for (let i = 1; i <= 10; i++) {
    const transportMode = modes[i % modes.length];
    const distanceKm = transportMode === "local" ? 50 : transportMode === "truck" ? 500 : 2000;

    await db.insert(schema.productTracking).values({
      productId: i,
      tpassId: `TPAS_${String(i).padStart(6, '0')}`,
      originCountry: countries[i % countries.length],
      originCity: `City ${i}`,
      transportMode,
      distanceKm,
      co2Kg: Math.floor(distanceKm * 0.1),
      dppHash: `hash_${i}`,
      customsCleared: i % 3 === 0 ? 1 : 0,
      ivaVerified: 1,
    });
  }

  // 12. Seed carbon_footprint (10)
  console.log("Creating 10 carbon footprints...");
  for (let i = 1; i <= 10; i++) {
    const lifecycleCo2 = Math.floor(Math.random() * 3000) + 1000;
    const transportCo2 = Math.floor(Math.random() * 1000) + 500;
    const packagingCo2 = Math.floor(Math.random() * 300) + 100;

    await db.insert(schema.carbonFootprint).values({
      productId: i,
      lifecycleCo2,
      transportCo2,
      packagingCo2,
      totalCo2: lifecycleCo2 + transportCo2 + packagingCo2,
    });
  }

  // 13. Seed system_logs (20)
  console.log("Creating 20 system logs...");
  const apps = ["APP Clienti", "DMS Backend", "Dashboard PA"];
  const levels = ["info", "warning", "error"];
  for (let i = 1; i <= 20; i++) {
    await db.insert(schema.systemLogs).values({
      app: apps[i % apps.length],
      level: levels[i % levels.length],
      type: `event_${i}`,
      message: `Log message ${i}`,
      userEmail: i % 2 === 0 ? `user${(i % 20) + 1}@test.com` : null,
      ipAddress: `192.168.1.${i}`,
    });
  }

  // 11. Seed user_analytics (20 records)
  console.log("Creating 20 user analytics...");
  const transports = ["bike", "car", "bus", "walk"];
  const origins = ["Bologna", "Modena", "Parma", "Reggio Emilia", "Ferrara"];
  for (let i = 1; i <= 20; i++) {
    await db.insert(schema.userAnalytics).values({
      userId: i,
      transport: transports[Math.floor(Math.random() * transports.length)],
      origin: origins[Math.floor(Math.random() * origins.length)],
      sustainabilityRating: 60 + Math.floor(Math.random() * 40),
      co2Saved: 100 + Math.floor(Math.random() * 500),
    });
  }

  // 12. Seed sustainability_metrics (7 days)
  console.log("Creating 7 sustainability metrics...");
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    await db.insert(schema.sustainabilityMetrics).values({
      date,
      populationRating: 70 + Math.floor(Math.random() * 15),
      totalCo2Saved: 1000 + Math.floor(Math.random() * 500),
      localPurchases: 300 + Math.floor(Math.random() * 100),
      ecommercePurchases: 150 + Math.floor(Math.random() * 50),
      avgCo2Local: 50 + Math.floor(Math.random() * 30),
      avgCo2Ecommerce: 200 + Math.floor(Math.random() * 100),
    });
  }

  // 13. Seed notifications (10 records)
  console.log("Creating 10 notifications...");
  const notifTypes = ["push", "email", "sms"];
  const notifTitles = [
    "Nuovo mercato aperto!",
    "Promozione BIO questa settimana",
    "Carbon credits accreditati",
    "Scadenza certificazione HACCP",
    "Nuovo bando regionale disponibile"
  ];
  for (let i = 1; i <= 10; i++) {
    const sent = 100 + Math.floor(Math.random() * 400);
    const delivered = Math.floor(sent * 0.95);
    const opened = Math.floor(delivered * 0.6);
    const clicked = Math.floor(opened * 0.3);
    await db.insert(schema.notifications).values({
      title: notifTitles[i % notifTitles.length],
      message: "Messaggio di notifica di esempio",
      type: notifTypes[i % notifTypes.length],
      targetUsers: JSON.stringify([1, 2, 3, 4, 5]),
      sent,
      delivered,
      opened,
      clicked,
    });
  }

  // 14. Seed inspections (15 records)
  console.log("Creating 15 inspections...");
  const inspectionTypes = ["DURC", "HACCP", "Sicurezza Lavoro", "Antincendio", "Privacy GDPR"];
  const inspectors = ["Dott. Rossi", "Ing. Bianchi", "Dott.ssa Verdi", "Geom. Neri"];
  const statuses = ["scheduled", "completed", "violation"];
  for (let i = 1; i <= 15; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + Math.floor(Math.random() * 30));
    await db.insert(schema.inspections).values({
      businessId: (i % 10) + 1,
      businessName: `Negozio ${(i % 10) + 1}`,
      type: inspectionTypes[i % inspectionTypes.length],
      inspector: inspectors[i % inspectors.length],
      status,
      scheduledDate,
      completedDate: status === "completed" ? new Date() : null,
      violationFound: status === "violation" ? 1 : 0,
      fineAmount: status === "violation" ? 50000 + Math.floor(Math.random() * 200000) : null,
      notes: status === "violation" ? "Violazione riscontrata" : null,
    });
  }

  // 15. Seed business_analytics (10 records)
  console.log("Creating 10 business analytics...");
  const businessCategories = ["Frutta", "Verdura", "Salumeria", "Formaggi", "Pane"];
  for (let i = 1; i <= 10; i++) {
    await db.insert(schema.businessAnalytics).values({
      businessId: i,
      businessName: `Negozio ${i}`,
      category: businessCategories[i % businessCategories.length],
      totalSales: 50 + Math.floor(Math.random() * 200),
      totalCredits: 500 + Math.floor(Math.random() * 2000),
      totalRevenue: 500000 + Math.floor(Math.random() * 2000000),
      rating: 3 + Math.floor(Math.random() * 3),
      isActive: 1,
      lastSaleAt: new Date(),
    });
  }

   // 16. Seed mobility_data (20 records: 12 bus stops + 5 lines + 3 parking)
  console.log("Creating 20 mobility data records...");
  
  // Bus stops (12 fermate principali Grosseto - struttura GTFS-like)
  const busStops = [
    { stopName: "Stazione FS Grosseto", lineNumber: "1, 3, 5", lat: "42.7606", lng: "11.1133", nextArrival: 3 },
    { stopName: "Piazza Dante", lineNumber: "2, 4", lat: "42.7650", lng: "11.1150", nextArrival: 8 },
    { stopName: "Mercato Coperto", lineNumber: "1, 2, 6", lat: "42.7620", lng: "11.1140", nextArrival: 12 },
    { stopName: "Ospedale Misericordia", lineNumber: "7, 8", lat: "42.7580", lng: "11.1200", nextArrival: 5 },
    { stopName: "Cittadella dello Studente", lineNumber: "3, 9", lat: "42.7700", lng: "11.1100", nextArrival: 15 },
    { stopName: "Centro Commerciale Aurelia", lineNumber: "5, 10", lat: "42.7550", lng: "11.1080", nextArrival: 7 },
    { stopName: "Marina di Grosseto", lineNumber: "6", lat: "42.7333", lng: "10.9833", nextArrival: 20 },
    { stopName: "Follonica Stazione", lineNumber: "11", lat: "42.9258", lng: "10.7594", nextArrival: 25 },
    { stopName: "Orbetello Centro", lineNumber: "12", lat: "42.4419", lng: "11.2169", nextArrival: 30 },
    { stopName: "Castiglione Pesca", lineNumber: "13", lat: "42.7667", lng: "10.8833", nextArrival: 18 },
    { stopName: "Porta Nuova", lineNumber: "1, 4", lat: "42.7640", lng: "11.1160", nextArrival: 6 },
    { stopName: "Viale Matteotti", lineNumber: "2, 3", lat: "42.7630", lng: "11.1145", nextArrival: 10 },
  ];

  const statuses = ["active", "active", "active", "active", "delayed", "suspended"];
  
  for (const stop of busStops) {
    await db.insert(schema.mobilityData).values({
      type: "bus",
      lineNumber: stop.lineNumber,
      lineName: `Linea ${stop.lineNumber.split(',')[0].trim()}`,
      stopName: stop.stopName,
      lat: stop.lat,
      lng: stop.lng,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      occupancy: 20 + Math.floor(Math.random() * 70), // 20-90%
      nextArrival: stop.nextArrival,
    });
  }

  // Tram lines (5 linee principali)
  const tramLines = [
    { line: "T1", name: "Linea Rossa", stop: "Capolinea Nord", lat: "42.7750", lng: "11.1050" },
    { line: "T2", name: "Linea Verde", stop: "Capolinea Est", lat: "42.7600", lng: "11.1250" },
    { line: "T3", name: "Linea Blu", stop: "Capolinea Sud", lat: "42.7450", lng: "11.1100" },
    { line: "T4", name: "Linea Gialla", stop: "Capolinea Ovest", lat: "42.7600", lng: "11.0950" },
    { line: "T5", name: "Linea Arancio", stop: "Capolinea Centro", lat: "42.7606", lng: "11.1133" },
  ];

  for (const tram of tramLines) {
    await db.insert(schema.mobilityData).values({
      type: "tram",
      lineNumber: tram.line,
      lineName: tram.name,
      stopName: tram.stop,
      lat: tram.lat,
      lng: tram.lng,
      status: "active",
      occupancy: 30 + Math.floor(Math.random() * 60),
      nextArrival: 5 + Math.floor(Math.random() * 15),
    });
  }

  // Parking (3 parcheggi principali)
  const parkings = [
    { name: "Parcheggio Stazione", lat: "42.7600", lng: "11.1130", total: 200, available: 45 },
    { name: "Parcheggio Centro", lat: "42.7640", lng: "11.1150", total: 350, available: 120 },
    { name: "Parcheggio Ospedale", lat: "42.7580", lng: "11.1200", total: 150, available: 30 },
  ];

  for (const parking of parkings) {
    await db.insert(schema.mobilityData).values({
      type: "parking",
      stopName: parking.name,
      lat: parking.lat,
      lng: parking.lng,
      status: "active",
      totalSpots: parking.total,
      availableSpots: parking.available,
    });
  }

  console.log("✅ Seed completed successfully!");
  console.log("\n📊 Summary:");
  console.log("- 1 carbon credits config");
  console.log("- 5 markets");
  console.log("- 10 shops");
  console.log("- 20 users");
  console.log("- 50 transactions");
  console.log("- 30 checkins");
  console.log("- 10 fund transactions");
  console.log("- 5 reimbursements");
  console.log("- 10 civic reports");
  console.log("- 20 products");
  console.log("- 10 product tracking (TPAS)");
  console.log("- 10 carbon footprints");
  console.log("- 20 system logs");
  console.log("- 20 user analytics");
  console.log("- 7 sustainability metrics");
  console.log("- 10 notifications");
  console.log("- 15 inspections");
  console.log("- 10 business analytics");
  console.log("- 20 mobility data (12 bus + 5 tram + 3 parking)");
  console.log("\n🚀 Total: ~290 records");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
