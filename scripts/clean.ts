import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);

async function clean() {
  console.log("🧹 Cleaning database...");

  try {
    // Disable foreign key checks
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);

    // Truncate all tables (order doesn't matter with FK checks disabled)
    const tables = [
      "system_logs",
      "audit_logs",
      "ecocredits",
      "carbon_footprint",
      "product_tracking",
      "products",
      "civic_reports",
      "reimbursements",
      "fund_transactions",
      "carbon_credits_config",
      "checkins",
      "transactions",
      "shops",
      "markets",
      "extended_users",
      "users"
    ];

    for (const table of tables) {
      console.log(`Truncating ${table}...`);
      await db.execute(sql.raw(`TRUNCATE TABLE \`${table}\``));
    }

    // Re-enable foreign key checks
    await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

    console.log("✅ Database cleaned successfully!");
  } catch (e) {
    console.error("❌ Clean failed:", e);
    process.exit(1);
  }
}

clean()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
