import { Pool } from "pg";
import { randomUUID } from "crypto";
import type { AlertRequest, Scenario, Verdict } from "./schema";

/**
 * Postgres access layer.
 *
 * If DATABASE_URL is unset we fall back to an in-process store. That keeps the
 * demo working on a laptop with no database and on a fresh Vercel deploy, at
 * the cost of losing data on restart and not sharing state between serverless
 * instances. The /api/health response reports which mode is active so this is
 * never a silent downgrade.
 */

export type AlertRow = {
  id: string;
  elder_name: string;
  verdict: Verdict;
  risk_score: number;
  tactics: string[];
  summary: string;
  created_at: string;
  resolved: boolean;
};

export type DrillRow = {
  id: string;
  scenario: Scenario;
  score: number;
  cues_caught: number;
  cues_total: number;
  created_at: string;
};

let pool: Pool | null = null;

function getPool(): Pool | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: 3,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 10_000,
      // Hosted Postgres (Neon, Vercel, Supabase-as-plain-PG) terminates TLS at
      // the pooler with a cert the default chain rejects.
      ssl: url.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
    });
    pool.on("error", (err) => console.error("[db] idle client error", err.message));
  }
  return pool;
}

export function isPostgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/* ------------------------------------------------------------------ */
/* In-memory fallback                                                  */
/* ------------------------------------------------------------------ */

const memory = {
  alerts: [] as AlertRow[],
  drills: [] as DrillRow[],
};

/* ------------------------------------------------------------------ */
/* Alerts                                                              */
/* ------------------------------------------------------------------ */

export async function insertAlert(input: AlertRequest): Promise<AlertRow> {
  const row: AlertRow = {
    id: randomUUID(),
    elder_name: input.elderName,
    verdict: input.verdict,
    risk_score: input.risk_score,
    tactics: input.tactics,
    summary: input.summary,
    created_at: new Date().toISOString(),
    resolved: false,
  };

  const p = getPool();
  if (!p) {
    memory.alerts.unshift(row);
    return row;
  }

  const { rows } = await p.query<AlertRow>(
    `INSERT INTO alerts (id, elder_name, verdict, risk_score, tactics, summary, resolved)
     VALUES ($1, $2, $3, $4, $5, $6, false)
     RETURNING id, elder_name, verdict, risk_score, tactics, summary,
               created_at::text, resolved`,
    [row.id, row.elder_name, row.verdict, row.risk_score, row.tactics, row.summary],
  );
  return rows[0];
}

export async function listAlerts(limit = 50): Promise<AlertRow[]> {
  const p = getPool();
  if (!p) return memory.alerts.slice(0, limit);

  const { rows } = await p.query<AlertRow>(
    `SELECT id, elder_name, verdict, risk_score, tactics, summary,
            created_at::text, resolved
     FROM alerts
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  );
  return rows;
}

export async function resolveAlert(id: string): Promise<boolean> {
  const p = getPool();
  if (!p) {
    const hit = memory.alerts.find((a) => a.id === id);
    if (hit) hit.resolved = true;
    return Boolean(hit);
  }

  const { rowCount } = await p.query(`UPDATE alerts SET resolved = true WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}

/* ------------------------------------------------------------------ */
/* Drill sessions                                                      */
/* ------------------------------------------------------------------ */

export async function insertDrill(input: {
  scenario: Scenario;
  score: number;
  cuesCaught: number;
  cuesTotal: number;
}): Promise<DrillRow> {
  const row: DrillRow = {
    id: randomUUID(),
    scenario: input.scenario,
    score: input.score,
    cues_caught: input.cuesCaught,
    cues_total: input.cuesTotal,
    created_at: new Date().toISOString(),
  };

  const p = getPool();
  if (!p) {
    memory.drills.unshift(row);
    return row;
  }

  const { rows } = await p.query<DrillRow>(
    `INSERT INTO drill_sessions (id, scenario, score, cues_caught, cues_total)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, scenario, score, cues_caught, cues_total, created_at::text`,
    [row.id, row.scenario, row.score, row.cues_caught, row.cues_total],
  );
  return rows[0];
}

export async function listDrills(limit = 20): Promise<DrillRow[]> {
  const p = getPool();
  if (!p) return memory.drills.slice(0, limit);

  const { rows } = await p.query<DrillRow>(
    `SELECT id, scenario, score, cues_caught, cues_total, created_at::text
     FROM drill_sessions
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit],
  );
  return rows;
}

/** Used by /api/health so a broken DATABASE_URL shows up before the demo. */
export async function pingDb(): Promise<"memory" | "postgres" | "error"> {
  const p = getPool();
  if (!p) return "memory";
  try {
    await p.query("SELECT 1");
    return "postgres";
  } catch {
    return "error";
  }
}
