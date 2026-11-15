INSERT INTO game_friendships (account_low, account_high, requester_id)
SELECT LEAST($1::uuid, id), GREATEST($1::uuid, id), $1
FROM game_accounts
WHERE id = $2 AND id <> $1
ON CONFLICT (account_low, account_high) DO NOTHING
RETURNING requester_id;
