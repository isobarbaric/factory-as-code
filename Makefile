.DEFAULT_GOAL := setup
export REPO_ID MANIFEST
export DATABASE_URL := sqlite:///$(CURDIR)/.local/records.db
export FACTORY_REPOS := $(CURDIR)/.local/repos.json
API_PORT ?= 8020
UI_PORT ?= 5180
SF_PLATFORM ?= $(HOME)/Documents/sf-platform
SF_FONTS := $(SF_PLATFORM)/.cursor/skills/frontend-visual-design/init/assets/fonts

.PHONY: setup register mcp mcp-config api ui fonts test

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
	uv run --locked uvicorn store.platform_api:local_app --factory --host 127.0.0.1 --port $(API_PORT)

ui:
	FACTORY_API_URL=http://127.0.0.1:$(API_PORT) UI_PORT=$(UI_PORT) npm run ui:dev

# Söhne is licensed to 8090 and must not be committed. This copies it from a
# local sf-platform checkout into the git-ignored frontend/public/fonts.
fonts:
	@test -d "$(SF_FONTS)" || (echo "Söhne not found at $(SF_FONTS); the UI will use the system font." && exit 1)
	mkdir -p frontend/public/fonts
	cp "$(SF_FONTS)"/*.woff2 frontend/public/fonts/

test:
	uv run --locked python -m unittest discover -s tests
