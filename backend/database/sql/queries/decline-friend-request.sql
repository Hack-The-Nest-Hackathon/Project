DELETE FROM game_friendships
WHERE account_low = LEAST($1::uuid, $2::uuid) AND account_high = GREATEST($1::uuid, $2::uuid)
  AND requester_id = $2 AND accepted_at IS NULL
RETURNING requester_id;
