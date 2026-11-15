SELECT account.id, COALESCE(account.display_name, 'Explorer') AS name,
  CASE WHEN friendship.accepted_at IS NOT NULL THEN 'friend'
       WHEN friendship.requester_id = $1 THEN 'sent'
       ELSE 'incoming' END AS status
FROM game_friendships AS friendship
JOIN game_accounts AS account
  ON account.id = CASE WHEN friendship.account_low = $1 THEN friendship.account_high ELSE friendship.account_low END
WHERE $1 IN (friendship.account_low, friendship.account_high)
ORDER BY friendship.created_at, account.id;
