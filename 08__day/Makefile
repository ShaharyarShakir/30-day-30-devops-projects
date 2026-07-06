.PHONY: up down restart logs status clean vault-status build dev lint test

build:
	pnpm run build

dev:
	pnpm run dev

lint:
	pnpm run lint

test:
	pnpm run test

up-dev:
	docker compose up --build

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose down
	docker compose up -d

logs:
	docker compose logs -f

status:
	docker compose ps

clean:
	docker compose down -v

# Quick check that Vault dev server is unsealed and reachable
vault-status:
	docker exec chaindeploy-vault vault status