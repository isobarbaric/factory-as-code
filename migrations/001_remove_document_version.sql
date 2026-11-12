BEGIN;

ALTER TABLE documents DROP COLUMN version_number;
ALTER TABLE documents ADD PRIMARY KEY (repo_name, document_id);

COMMIT;
