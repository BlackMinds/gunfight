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
  highest_stage INTEGER NOT NULL DEFAULT 0 CHECK (highest_stage BETWEEN 0 AND 10000),
  best_bounty_ms INTEGER CHECK (best_bounty_ms IS NULL OR best_bounty_ms > 0),
  survival_kills INTEGER NOT NULL DEFAULT 0 CHECK (survival_kills >= 0),
  event_score INTEGER NOT NULL DEFAULT 0 CHECK (event_score >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, season_id)
);

CREATE INDEX IF NOT EXISTS gunfight_season_stage_rank ON gunfight_season_scores (season_id, highest_stage DESC);
CREATE INDEX IF NOT EXISTS gunfight_season_bounty_rank ON gunfight_season_scores (season_id, best_bounty_ms ASC) WHERE best_bounty_ms IS NOT NULL;
CREATE INDEX IF NOT EXISTS gunfight_season_survival_rank ON gunfight_season_scores (season_id, survival_kills DESC);
CREATE INDEX IF NOT EXISTS gunfight_season_event_rank ON gunfight_season_scores (season_id, event_score DESC);
