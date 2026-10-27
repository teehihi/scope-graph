.PHONY: all setup test build run-local docker-up docker-down clean mcp

all: setup test build

setup:
	python3 -m venv .venv
	. .venv/bin/activate && pip install -r services/api/requirements.txt
	cd apps/web && npm install

test:
	. .venv/bin/activate && PYTHONPATH=services/api pytest services/api/tests/ -v

build:
	cd apps/web && npm run build

run-api:
	. .venv/bin/activate && cd services/api && uvicorn app.main:app --reload --port 8000

run-web:
	cd apps/web && npm run dev

run-worker:
	. .venv/bin/activate && cd services/api && python -m app.jobs.worker

mcp:
	. .venv/bin/activate && cd services/api && python -m app.mcp.server

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down -v

docker-logs:
	docker compose logs -f

clean:
	rm -rf .pytest_cache data/workspaces data/*.db apps/web/dist
