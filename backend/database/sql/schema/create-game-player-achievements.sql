CREATE TABLE IF NOT EXISTS game_player_achievements (
  player_id uuid NOT NULL REFERENCES game_accounts(id) ON DELETE CASCADE,
  achievement_id text NOT NULL,
  sticker_id text NOT NULL,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, achievement_id),
  UNIQUE (player_id, sticker_id)
);
