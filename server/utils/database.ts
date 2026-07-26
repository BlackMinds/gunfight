import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { createError } from 'h3'

const { Pool } = pg
let pool: pg.Pool | null = null
let schemaReady: Promise<void> | null = null

export function database() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw createError({ statusCode: 503, message: '云存档数据库尚未配置 DATABASE_URL' })
  let hostname: string
  try {
    const url = new URL(connectionString)
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') throw new Error('invalid protocol')
    hostname = url.hostname
  } catch {
    throw createError({ statusCode: 503, message: '云存档数据库配置无效' })
  }
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]'
  pool ??= new Pool({
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: true },
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 10_000
  })
  return pool
}

export async function ensureCloudSchema() {
  if (schemaReady) return schemaReady
  const attempt = (async () => {
    const existing = await database().query<{ users_table: string | null; saves_table: string | null; season_scores_table: string | null; ranked_progress_table: string | null; ranked_runs_table: string | null }>(`
      SELECT
        to_regclass('public.gunfight_users') AS users_table,
        to_regclass('public.gunfight_cloud_saves') AS saves_table,
        to_regclass('public.gunfight_season_scores') AS season_scores_table,
        to_regclass('public.gunfight_ranked_progress') AS ranked_progress_table,
        to_regclass('public.gunfight_ranked_runs') AS ranked_runs_table
    `)
    if (existing.rows[0]?.users_table && existing.rows[0]?.saves_table && existing.rows[0]?.season_scores_table && existing.rows[0]?.ranked_progress_table && existing.rows[0]?.ranked_runs_table) return
    await database().query(`
      CREATE TABLE IF NOT EXISTS gunfight_users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS gunfight_cloud_saves (
        user_id TEXT PRIMARY KEY REFERENCES gunfight_users(id) ON DELETE CASCADE,
        revision INTEGER NOT NULL DEFAULT 1,
        payload JSONB NOT NULL,
        saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS gunfight_season_scores (
        user_id TEXT NOT NULL REFERENCES gunfight_users(id) ON DELETE CASCADE,
        season_id TEXT NOT NULL,
        highest_stage INTEGER NOT NULL DEFAULT 0,
        best_bounty_ms INTEGER,
        survival_kills INTEGER NOT NULL DEFAULT 0,
        event_score INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, season_id),
        CHECK (highest_stage BETWEEN 0 AND 10000),
        CHECK (best_bounty_ms IS NULL OR best_bounty_ms > 0),
        CHECK (survival_kills >= 0),
        CHECK (event_score >= 0)
      );
      CREATE INDEX IF NOT EXISTS gunfight_season_stage_rank ON gunfight_season_scores (season_id, highest_stage DESC);
      CREATE INDEX IF NOT EXISTS gunfight_season_bounty_rank ON gunfight_season_scores (season_id, best_bounty_ms ASC) WHERE best_bounty_ms IS NOT NULL;
      CREATE INDEX IF NOT EXISTS gunfight_season_survival_rank ON gunfight_season_scores (season_id, survival_kills DESC);
      CREATE INDEX IF NOT EXISTS gunfight_season_event_rank ON gunfight_season_scores (season_id, event_score DESC);
      CREATE TABLE IF NOT EXISTS gunfight_ranked_progress (
        user_id TEXT PRIMARY KEY REFERENCES gunfight_users(id) ON DELETE CASCADE,
        highest_stage INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (highest_stage BETWEEN 0 AND 10000)
      );
      CREATE TABLE IF NOT EXISTS gunfight_ranked_runs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES gunfight_users(id) ON DELETE CASCADE,
        season_id TEXT NOT NULL,
        activity_id TEXT NOT NULL,
        mode TEXT NOT NULL CHECK (mode IN ('campaign', 'challenge', 'survival', 'bounty', 'event')),
        stage INTEGER NOT NULL CHECK (stage BETWEEN 1 AND 10000),
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ NOT NULL,
        completed_at TIMESTAMPTZ,
        duration_ms INTEGER,
        kills INTEGER,
        event_score INTEGER NOT NULL DEFAULT 0,
        CHECK (duration_ms IS NULL OR duration_ms BETWEEN 1 AND 1800000),
        CHECK (kills IS NULL OR kills >= 0),
        CHECK (event_score >= 0)
      );
      CREATE INDEX IF NOT EXISTS gunfight_ranked_runs_user_active ON gunfight_ranked_runs (user_id, status, started_at DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS gunfight_ranked_runs_one_active ON gunfight_ranked_runs (user_id) WHERE status = 'active';
      CREATE INDEX IF NOT EXISTS gunfight_ranked_runs_season_completed ON gunfight_ranked_runs (season_id, user_id, completed_at) WHERE status = 'completed';
    `)
  })()
  schemaReady = attempt
  try {
    await attempt
  } catch (error) {
    if (schemaReady === attempt) schemaReady = null
    throw error
  }
}

export const createUserId = () => randomUUID()
