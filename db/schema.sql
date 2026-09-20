-- KAVACH schema. Plain PostgreSQL, no extensions beyond pgcrypto for UUIDs.
-- Apply with:  psql "$DATABASE_URL" -f db/schema.sql
--          or: npm run db:init

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  role        text NOT NULL CHECK (role IN ('elder', 'guardian')),
  lang        text NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'hi')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS family_links (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  guardian_id  uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'revoked')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (elder_id, guardian_id)
);

-- Privacy: we store the summary and tactic tags only. The raw message the
-- elder pasted is never written here.
CREATE TABLE IF NOT EXISTS alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  elder_id    uuid REFERENCES users (id) ON DELETE SET NULL,
  elder_name  text NOT NULL DEFAULT 'Family member',
  verdict     text NOT NULL CHECK (verdict IN ('SAFE', 'SUSPICIOUS', 'SCAM')),
  risk_score  integer NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  tactics     text[] NOT NULL DEFAULT '{}',
  summary     text NOT NULL,
  resolved    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alerts_created_at_idx ON alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS alerts_unresolved_idx ON alerts (resolved) WHERE resolved = false;

CREATE TABLE IF NOT EXISTS drill_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES users (id) ON DELETE SET NULL,
  scenario     text NOT NULL CHECK (
                 scenario IN ('bank_kyc', 'parcel', 'lottery', 'fake_official', 'legit_call')
               ),
  cues_caught  integer NOT NULL DEFAULT 0,
  cues_total   integer NOT NULL DEFAULT 0,
  score        integer NOT NULL CHECK (score BETWEEN 0 AND 100),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS drill_sessions_created_at_idx ON drill_sessions (created_at DESC);
