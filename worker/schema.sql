CREATE TABLE IF NOT EXISTS board (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  rev        INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT 0,
  payload    TEXT    NOT NULL DEFAULT 'null'
);

-- Key/value settings. Holds only 'pin_hash': the SHA-256 digest of the editor
-- PIN, so the PIN itself is never written down anywhere.
CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);