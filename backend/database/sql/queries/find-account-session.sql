SELECT account.id, account.display_name AS name, session.expires_at AS "expiresAt"
FROM game_sessions AS session
JOIN game_accounts AS account ON account.id = session.account_id
WHERE session.token_hash = $1 AND session.expires_at > now();
