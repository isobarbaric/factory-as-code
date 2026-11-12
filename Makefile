.DEFAULT_GOAL := setup
REPO_ID ?= github:1454895720
export REPO_ID
export DATABASE_URL := sqlite:///$(CURDIR)/.local/records.db
export PROCESS_REPOS := $(CURDIR)/.local/repos.json

.PHONY: setup mcp mcp-config test

setup:
	npm ci
	npm run build
	uv sync --locked
	uv run --locked python -m scripts.local_setup

mcp:
	@uv run --locked python -m store.mcp_server

mcp-config:
	@uv run --locked python -m scripts.local_setup --client-config

test:
	uv run --locked python -m unittest discover -s tests
