insert into players (name, emoji) values
  ('Pilunga', '⚡'),
  ('Negro', '🐺'),
  ('Bauti', '🎸'),
  ('Octa', '🐙'),
  ('Leskano', '🧠'),
  ('Pablito', '🐢'),
  ('Juli', '🎯'),
  ('Seba', '🦅'),
  ('Alex', '⭐'),
  ('Stricker', '🎮')
on conflict (name) do nothing;
