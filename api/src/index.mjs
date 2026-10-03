// Entry point for the container: connects to Postgres, applies any pending migrations,
// and starts listening (on 127.0.0.1 only: Nginx is the only thing that should talk to it).

import pg from "pg";
import { buildApp } from "./app.mjs";
import { pgAdapter } from "./db.mjs";
import { migrate } from "../../db/lib/migrate.mjs";

const { DATABASE_URL, PORT = "3100", HOST = "127.0.0.1", HOUSEHOLD_ID, AUTO_MIGRATE = "true" } = process.env;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: DATABASE_URL, max: Number(process.env.DB_POOL_MAX || 5) });
// An idle connection can drop (database restart, network blip). Without this handler Node would
// treat the pool's error event as fatal and crash the whole API; log it and let the pool reconnect.
pool.on("error", (err) => console.error("database connection error (pool will reconnect):", err.message));
const db = pgAdapter(pool);

if (AUTO_MIGRATE !== "false") {
  // migrations run on one dedicated connection so BEGIN/COMMIT apply to the same session
  const client = await pool.connect();
  try {
    const ran = await migrate(client, { log: (m) => console.log(m) });
    console.log(ran.length ? `applied migrations: ${ran.join(", ")}` : "database schema is up to date");
  } finally {
    client.release();
  }
}

const app = await buildApp({ db, householdId: HOUSEHOLD_ID || null, logger: { level: process.env.LOG_LEVEL || "info" } });
await app.listen({ port: Number(PORT), host: HOST });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await app.close();
    await db.end();
    process.exit(0);
  });
}
