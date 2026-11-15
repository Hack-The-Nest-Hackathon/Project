INSERT INTO game_player_achievements (player_id, achievement_id, sticker_id)
SELECT $1, eligible.achievement_id, eligible.sticker_id
FROM unnest($2::text[], $3::text[]) AS eligible(achievement_id, sticker_id)
ON CONFLICT (player_id, achievement_id) DO NOTHING;
