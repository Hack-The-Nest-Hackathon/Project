import { db, initializeDatabase } from "./index.js";

try {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in backend/.env");
  await initializeDatabase();
  console.log("Database schema is ready.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Database initialization failed");
  process.exitCode = 1;
} finally {
  await db.end();
}
