-- Run via psql with repo_ids set to a JSON object mapping old names to stable IDs.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE documents, tickets, files IN ACCESS EXCLUSIVE MODE;
CREATE TEMP TABLE repo_map (name text PRIMARY KEY, id text UNIQUE NOT NULL CHECK (id <> '')) ON COMMIT DROP;
INSERT INTO repo_map SELECT key, value FROM jsonb_each_text(:'repo_ids'::jsonb);
DO $$
BEGIN
    IF EXISTS (
        SELECT repo_name FROM (SELECT repo_name FROM documents UNION SELECT repo_name FROM tickets
                               UNION SELECT repo_name FROM files) existing
        EXCEPT SELECT name FROM repo_map
    ) THEN RAISE EXCEPTION 'Missing repo ID mapping'; END IF;
    IF EXISTS (SELECT 1 FROM repo_map a JOIN repo_map b ON a.id = b.name WHERE a.name <> b.name)
    THEN RAISE EXCEPTION 'Use IDs distinct from other legacy names'; END IF;
END $$;
UPDATE documents SET repo_name = id FROM repo_map WHERE repo_name = name;
UPDATE tickets SET repo_name = id FROM repo_map WHERE repo_name = name;
UPDATE files SET repo_name = id FROM repo_map WHERE repo_name = name;
ALTER TABLE documents RENAME COLUMN repo_name TO repo_id;
ALTER TABLE tickets RENAME COLUMN repo_name TO repo_id;
ALTER TABLE files RENAME COLUMN repo_name TO repo_id;
COMMIT;
