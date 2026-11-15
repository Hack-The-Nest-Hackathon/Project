SELECT slot, progress
FROM game_saves
WHERE player_id = $1
ORDER BY slot;
