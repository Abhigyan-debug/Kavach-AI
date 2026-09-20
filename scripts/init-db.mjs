// Applies db/schema.sql to $DATABASE_URL. Idempotent - safe to re-run.
import { readFileSync } from "node:fs";
import { Client } from "pg";

const url = process.env.DATABASE_URL;

if (!url) {
  console.error(
    "DATABASE_URL is not set.\n" +
      "Kavach runs without it (in-memory store), but nothing is persisted.\n" +
      "Set it in .env.local, then re-run: npm run db:init",
  );
  process.exit(1);
}

const sql = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");

const client = new Client({
  connectionString: url,
  ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  await client.query(sql);
  const { rows } = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`,
  );
  console.log("Schema applied. Tables:", rows.map((r) => r.table_name).join(", "));
} catch (err) {
  console.error("Failed to apply schema:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
