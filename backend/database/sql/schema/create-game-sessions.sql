CREATE TABLE IF NOT EXISTS game_sessions (
  token_hash text PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES game_accounts(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
