import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { createError } from 'h3'

const { Pool } = pg
let pool: pg.Pool | null = null
let schemaReady: Promise<void> | null = null

export function database() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw createError({ statusCode: 503, message: '云存档数据库尚未配置 DATABASE_URL' })
  pool ??= new Pool({ connectionString, ssl: connectionString.includes('localhost') ? undefined : { rejectUnauthorized: false }, max: 5 })
  return pool
}

export async function ensureCloudSchema() {
  schemaReady ??= (async () => {
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
    `)
  })()
  return schemaReady
}

export const createUserId = () => randomUUID()
