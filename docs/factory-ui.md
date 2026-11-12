# Factory workspace UI

A local web workspace for the records in the factory store, styled after 8090's Software Factory. The sidebar is built at runtime from the selected repository's compiled factory, so each repository shows its own documents, tickets and files.

- **Documents**: list, create, edit the title and Markdown body in a rich-text editor (saved automatically), comment, and delete.
- **Tickets**: table grouped by status or a board, create, edit the title and description, change status within the entity's configured `statuses`, assign, comment, and delete.
- **Files**: a placeholder list.

## Run it

```bash
make setup          # once: Python deps and an empty local store
npm ci              # once: frontend deps
make fonts          # optional: copies 8090's Söhne from a local sf-platform checkout
make api            # http://127.0.0.1:8020
make ui             # http://localhost:5180, proxies /api to the API
```

Register repositories with `make register REPO_ID=<id> MANIFEST=<path>` and restart `make api`. Override ports with `API_PORT=… UI_PORT=…`.

Söhne is licensed to 8090 and is never committed; `make fonts` copies it into the git-ignored `frontend/public/fonts`. Without it the UI uses the system font.

## Platform API

The API shares the MCP server's database, repository allowlist and response models. Every route takes the registered repository as the `repo_id` query parameter; the full list is at <http://127.0.0.1:8020/docs>.

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/repositories` | Registered repositories |
| GET | `/api/factory` | Compiled factory manifest |
| GET, POST | `/api/documents` | List or create documents |
| GET, PATCH, DELETE | `/api/documents/{id}` | Read, edit or delete a document |
| GET, POST | `/api/tickets` | List or create tickets |
| GET, PATCH, DELETE | `/api/tickets/{id}` | Read, edit or delete a ticket |
| GET, POST | `/api/comments` | List a record's comments (`target_type`, `target_id`) or add one |
| PATCH, DELETE | `/api/comments/{id}` | Edit, resolve or delete a comment |

Writes are checked against the manifest: documents and tickets must use a declared entity, and ticket statuses must be one of that entity's `statuses`. This listener is for the trusted local machine; a shared deployment needs per-client authorization.
