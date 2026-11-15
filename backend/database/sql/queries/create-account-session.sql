WITH account AS (
  INSERT INTO game_accounts (id, issuer, subject, email, display_name)
  VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (issuer, subject) DO UPDATE
    SET email = EXCLUDED.email, display_name = EXCLUDED.display_name
  RETURNING id
),
revoked AS (
  DELETE FROM game_sessions WHERE token_hash = $8
)
INSERT INTO game_sessions (token_hash, account_id, expires_at)
SELECT $6, id, $7 FROM account;
