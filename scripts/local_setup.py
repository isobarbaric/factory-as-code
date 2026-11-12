import json
import os
import shutil
import sys
from pathlib import Path

from sqlmodel import SQLModel, create_engine

from store import models  # Register all tables before create_all.


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
    repo_id = os.environ["REPO_ID"].strip()
    if not repo_id:
        raise SystemExit("REPO_ID must be nonblank")
    repos.parent.mkdir(exist_ok=True)
    SQLModel.metadata.create_all(create_engine(url))
    manifests = json.loads(repos.read_text()) if repos.exists() else {}
    manifests[repo_id] = str(root / ".process/dist/process.json")
    repos.write_text(json.dumps(manifests, indent=2) + "\n")
    print(
        f"Local database ready for {repo_id}. Run make mcp-config for agent settings."
    )


if __name__ == "__main__":
    main()
