# Process data model (draft)

A repository defines which entities its team uses. A team might declare Blueprint as a document, Work Order as a ticket, and Test Report as files. Creating a second work order creates another ticket record under the same Work Order definition.

## What lives where

| Owner | Data it maintains |
| --- | --- |
| Git repository | `.process/process.ts` declares entity names and types, an optional list of integration providers, and optional skill and automation root paths. The paths resolve relative to `.process/`. |
| Build | `.process/dist/process.json` is a reproducible manifest of that configuration. Consumers can load it to resolve an entity name. |
| Record store (proposed) | Document revisions, current tickets, and file collections. IDs are strings scoped to an owner-qualified `repo_name`. |
| Object store (proposed) | The bytes for each file, grouped under the collection's `object_prefix`. |

## Manifest validation

Before inserting or updating a row, load the built manifest for its `repo_name`. Find the entry in `entities` whose `name` equals `entity_name`. Its `type` must match the destination table: `document` for `documents`, `ticket` for `tickets`, and `files` for `files`. Reject the write if validation cannot complete, including when the manifest is unavailable, the name is missing, or its type differs. Git owns the entity definitions.

## PostgreSQL tables

All three tables scope IDs to an owner-qualified repository name. JSONB metadata values must be JSON objects when present.

### documents

One row per immutable revision. Primary key: `(repo_name, document_id, version_number)`.

| Column | Type | Nullable | Meaning or constraint |
| --- | --- | --- | --- |
| `repo_name` | text | No | Owning repository |
| `document_id` | text | No | Stable across revisions |
| `version_number` | integer | No | Positive, starts at 1 |
| `entity_name` | text | No | Configured document entity |
| `content` | text | No | Full text at this revision |
| `metadata` | jsonb | No | Defaults to `{}` |

### tickets

One row per current ticket. Primary key: `(repo_name, ticket_id)`.

| Column | Type | Nullable | Meaning or constraint |
| --- | --- | --- | --- |
| `repo_name` | text | No | Owning repository |
| `ticket_id` | text | No | Ticket identifier |
| `entity_name` | text | No | Configured ticket entity |
| `title` | text | No | Nonblank summary |
| `description` | text | No | May be empty |
| `status` | text | No | Current status |
| `assignee` | text | Yes | User ID, null when unassigned |
| `metadata` | jsonb | Yes | Additional ticket attributes |

### files

One row per object collection. Primary key: `(repo_name, files_id)`. Unique constraint: `(repo_name, object_prefix)`.

| Column | Type | Nullable | Meaning or constraint |
| --- | --- | --- | --- |
| `repo_name` | text | No | Owning repository |
| `files_id` | text | No | Collection identifier |
| `entity_name` | text | No | Configured files entity |
| `object_prefix` | text | No | Prefix in the repository's storage namespace |
| `metadata` | jsonb | Yes | Additional collection attributes |

## Record lifecycle

**Document.** Assign a stable `document_id` at creation and start `version_number` at 1. To edit revision 3, insert revision 4 under the same ID and entity name. Enforce uniqueness of the primary key so concurrent edits based on revision 3 cannot both succeed. Read the highest version for the current document or request a specific version for historical content.

**Ticket.** Update the existing row when its status, description, or assignee changes. An unassigned ticket stores `assignee: null`. The current schema accepts a string for status. It does not define a shared status vocabulary or require a ticket history.

**Files.** Keep one row for a collection regardless of how many objects it contains. For example, a Test Report with `files_id = "report-184"` can reference the prefix `reports/run-184/`. Listing that prefix retrieves entries such as `results.xml` and `coverage/index.html`. Resolve the prefix within the repo's configured storage namespace. Allocate non-overlapping prefixes. The unique constraint rejects identical prefixes, but the writer must also avoid placing one collection beneath another.

## Decisions for review

- **Entity renames.** Records refer to the configured name. A rename from Blueprint to Design Brief would leave historical revisions referring to Blueprint. The simplest initial policy is to keep names in use resolvable and introduce a new name for future records. Supporting renames in place requires a way to resolve the old name.
- **File retention.** Listing a prefix returns its current contents. If published reports must be reproducible, the writer needs to finish uploading before publishing the row and prevent later changes to that prefix.
- **Repository identity.** The agreed record types use `repo_name`. A repository rename or transfer therefore needs either a coordinated update of its record keys or a stable repository identifier.

The existing build validates the repository configuration. The primary keys and write behavior above are proposed contracts for a future record store.
