.DEFAULT_GOAL := setup
export REPO_ID MANIFEST
export DATABASE_URL := sqlite:///$(CURDIR)/.local/records.db
export FACTORY_REPOS := $(CURDIR)/.local/repos.json

.PHONY: setup register mcp mcp-config test

setup:
	uv sync --locked
	uv run --locked python -m scripts.local_setup

register:
	@uv run --locked python -m scripts.local_setup --register

mcp:
	@uv run --locked python -m store.mcp_server

mcp-config:
	@uv run --locked python -m scripts.local_setup --client-config

test:
	uv run --locked python -m unittest discover -s tests
