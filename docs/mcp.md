# Read project data with MCP

The agent's MCP host launches a local process over stdio. Each connection has an operator-configured allowlist of repository IDs. Use a stable ID from the source provider, such as `github:12345`, consistently when storing records and configuring the server. Repository renames preserve that ID.

1. Build the manifest in each project with the existing process build command.
2. Write a local JSON file mapping authorized repository IDs to their built manifest paths. Relative paths resolve from this JSON file. For example:

   ```json
   {"github:12345": "/projects/payments/.process/dist/process.json"}
   ```

3. Configure the MCP client to launch the server. Replace the paths and supply a PostgreSQL connection with SELECT access to documents and tickets.

   ```json
   {
     "mcpServers": {
       "process": {
         "command": "uv",
         "args": ["--directory", "/path/to/process-as-code", "run", "--locked", "python", "-m", "process_store.mcp_server"],
         "env": {
           "PROCESS_REPOS": "/path/to/repos.json",
           "DATABASE_URL": "postgresql+psycopg://reader@localhost/process"
         }
       }
     }
   }
   ```

The host chooses the allowlist and credentials at startup. Give each local client a configuration appropriate to its access. This is a trusted local subprocess model. A shared remote deployment would need its own authenticated transport.

| Tool | Arguments | Result |
| --- | --- | --- |
| get_process | repo_id | Built manifest |
| list_documents | repo_id, optional entity_name and cursor | ID, entity name and latest revision number per document |
| get_document | repo_id, document_id, optional version_number | Full exact revision, defaulting to latest |
| list_tickets | repo_id, optional entity_name, status, assignee and cursor | ID, entity name, title, status and assignee |
| get_ticket | repo_id, ticket_id | Full current ticket |

Lists return up to 50 items in ID order. Pass the returned `next_cursor` with the same repo and filters to continue. A null cursor marks the last page. Unknown repositories and missing records produce tool errors.

## Existing databases

For a fresh database use the SQLModel setup in [the data model](data-model.md). For existing databases, schedule a maintenance window and stop old readers and writers. The migration rewrites repository keys and takes exclusive locks on all three tables. Supply the verified old-name-to-ID mapping for every stored repo:

```sh
psql "$PGURL" -X -v repo_ids='{"owner/project":"github:12345"}' -f migrations/001_repo_ids.sql
```

Use a psql-compatible connection URL for PGURL. A missing mapping or lock timeout rolls back the transaction. Correct the mapping or drain connections and retry. After commit, deploy clients that use repo_id and key the writer's manifest map by the same IDs.
