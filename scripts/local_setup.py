import fcntl
import json
import os
import shutil
import sys
from pathlib import Path

from tempfile import NamedTemporaryFile

from pydantic import ValidationError
from sqlmodel import SQLModel, create_engine

from store import models  # Register all tables before create_all.
from store.responses import ProcessManifest


def main():
    root = Path.cwd()
    repos = Path(os.environ["PROCESS_REPOS"])
    url = os.environ["DATABASE_URL"]
    if sys.argv[1:] == ["--client-config"]:
        print(
            json.dumps(
                {
                    "mcpServers": {
                        "process": {
                            "command": shutil.which("uv"),
                            "args": [
                                "--directory",
                                str(root),
                                "run",
                                "--locked",
                                "python",
                                "-m",
                                "store.mcp_server",
                            ],
                            "env": {"DATABASE_URL": url, "PROCESS_REPOS": str(repos)},
                        }
                    }
                },
                indent=2,
            )
        )
        return
    if sys.argv[1:] == ["--register"]:
        repo_id = os.environ.get("REPO_ID", "").strip()
        path = os.environ.get("MANIFEST", "")
        if not repo_id or not path.strip():
            raise SystemExit("Usage: make register REPO_ID=<id> MANIFEST=<path>")
        manifest = Path(path).expanduser().resolve()
        try:
            ProcessManifest.model_validate_json(manifest.read_bytes())
        except (OSError, ValidationError) as exc:
            raise SystemExit(f"Invalid manifest {manifest}: {exc}") from exc
        if not repos.exists():
            raise SystemExit("Run make setup first")
        with repos.with_suffix(".lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            manifests = json.loads(repos.read_text())
            manifests[repo_id] = str(manifest)
            with NamedTemporaryFile(mode="w", dir=repos.parent, delete=False) as tmp:
                json.dump(manifests, tmp, indent=2)
                tmp.write("\n")
            os.replace(tmp.name, repos)
        print(f"Registered {repo_id}. Restart any running MCP connection.")
        return

    repos.parent.mkdir(parents=True, exist_ok=True)
    SQLModel.metadata.create_all(create_engine(url))
    with repos.with_suffix(".lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if not repos.exists():
            repos.write_text("{}\n")
    print("Local database ready. Run make mcp-config for agent settings.")


if __name__ == "__main__":
    main()
