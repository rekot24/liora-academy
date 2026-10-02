// Connects to Postgres with a single client (so BEGIN/COMMIT apply to one session).
// Reads DATABASE_URL from the environment, or from db/.env (which is gitignored).

import { readFile } from "node:fs/promises";
import pg from "pg";

async function loadDotEnv() {
  try {
    const text = await readFile(new URL("../.env", import.meta.url), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env file: fine */
  }
}

export async function connect() {
  await loadDotEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set. Put it in db/.env, e.g.\n  DATABASE_URL=postgres://homeschool_app:PASSWORD@127.0.0.1:5432/homeschool");
    process.exit(2);
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  return client;
}
