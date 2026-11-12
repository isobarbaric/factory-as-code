.DEFAULT_GOAL := setup
export REPO_ID MANIFEST
export DATABASE_URL := sqlite:///$(CURDIR)/.local/records.db
export PROCESS_REPOS := $(CURDIR)/.local/repos.json

.PHONY: setup register mcp mcp-config api test

setup:
	uv sync --locked
	uv run --locked python -m scripts.local_setup

register:
	@uv run --locked python -m scripts.local_setup --register

mcp:
	@uv run --locked python -m store.mcp_server

mcp-config:
	@uv run --locked python -m scripts.local_setup --client-config

api:
	uv run --locked uvicorn store.platform_api:local_app --factory --host 127.0.0.1 --port 8000

test:
	uv run --locked python -m unittest discover -s tests
