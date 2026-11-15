WITH members AS (
  SELECT $1::uuid AS id
  UNION ALL
  SELECT CASE WHEN account_low = $1 THEN account_high ELSE account_low END
  FROM game_friendships
  WHERE $1 IN (account_low, account_high) AND accepted_at IS NOT NULL
)
SELECT account.id, COALESCE(account.display_name, 'Explorer') AS name,
  COALESCE(stats.badges, 0)::int AS badges, COALESCE(stats.clues, 0)::int AS clues
FROM members
JOIN game_accounts AS account ON account.id = members.id
LEFT JOIN LATERAL (
  SELECT count(DISTINCT item.value) FILTER (WHERE item.kind = 'badge') AS badges,
         count(DISTINCT item.value) FILTER (WHERE item.kind = 'clue') AS clues
  FROM game_saves AS save
  CROSS JOIN LATERAL (
    SELECT 'badge' AS kind, value FROM jsonb_array_elements_text(save.progress->'badges')
    UNION ALL
    SELECT 'clue' AS kind, value FROM jsonb_array_elements_text(save.progress->'observed')
  ) AS item
  WHERE save.player_id = account.id
) AS stats ON true
ORDER BY badges DESC, clues DESC, account.id;
