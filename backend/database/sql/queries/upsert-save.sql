INSERT INTO game_saves (player_id, slot, progress)
VALUES ($1, $2, $3)
ON CONFLICT (player_id, slot) DO UPDATE
SET progress = EXCLUDED.progress,
    updated_at = now();
