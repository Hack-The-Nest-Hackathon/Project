SELECT achievement_id, sticker_id, earned_at
FROM game_player_achievements
WHERE player_id = $1
ORDER BY earned_at, achievement_id;
