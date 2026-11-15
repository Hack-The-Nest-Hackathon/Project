CREATE TABLE IF NOT EXISTS game_friendships (
  account_low uuid NOT NULL REFERENCES game_accounts(id) ON DELETE CASCADE,
  account_high uuid NOT NULL REFERENCES game_accounts(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_low, account_high),
  CHECK (account_low < account_high),
  CHECK (requester_id IN (account_low, account_high))
);
