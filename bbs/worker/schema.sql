CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL UNIQUE,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_posts_number ON posts(number DESC);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY,count INTEGER NOT NULL);
INSERT OR IGNORE INTO posts(id,number,author,body,created_at)
VALUES('00000000-0000-4000-8000-000000000001',1,'掲示板案内',
'ここは匿名の雑談掲示板です。研究・技術・教育・雑談など、自由に書き込んでください。\n\n他人の個人情報の掲載や迷惑行為はご遠慮ください。',1792252800);
