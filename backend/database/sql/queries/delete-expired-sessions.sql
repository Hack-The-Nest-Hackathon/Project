DELETE FROM game_sessions WHERE expires_at <= now();
