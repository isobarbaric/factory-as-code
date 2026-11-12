# Local process browser

Run the browser on localhost for a trusted repository. It reads existing PostgreSQL records and the built process manifest. Tickets support status and assignee edits. Settings display the manifest.

```sh
npm ci && npm run build
python -m venv .venv
. .venv/bin/activate
pip install -r requirements-ui.txt
export PROCESS_REPO='owner/repo'
export DATABASE_URL='postgresql+psycopg://localhost/process'
flask --app process_ui.app run
```

Open http://127.0.0.1:5000. Initialize a fresh database using the record store instructions in [the data model](data-model.md). Existing databases need the document title change described there. The browser displays empty states until records are present.

The manifest defaults to `.process/dist/process.json`. Set `PROCESS_MANIFEST` to select another build. Set `PROCESS_CONFIG_URL` to a trusted GitHub blob URL for that build's source revision to enable the settings link.

For files, set `PROCESS_BUCKET` and supply S3 read credentials through the normal AWS credential chain. Optionally set `PROCESS_S3_ENDPOINT` for a compatible store. Keys are scoped to `<owner/repo>/<object_prefix>/`. Text previews show up to 64 KiB as escaped plain text. Download links expire after five minutes. This local browser relies on the operator’s database and storage access and has no multi-user authentication.
