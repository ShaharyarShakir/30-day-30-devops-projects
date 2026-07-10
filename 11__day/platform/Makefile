COMPOSE_FILE=infrastructure/compose/docker-compose.yml

.PHONY: up down restart logs lint format test clean build-all

up:
	@echo "Starting platform infrastructure and applications..."
	docker compose -f $(COMPOSE_FILE) up -d --build

down:
	@echo "Stopping platform services..."
	docker compose -f $(COMPOSE_FILE) down -v

restart:
	@echo "Restarting platform services..."
	docker compose -f $(COMPOSE_FILE) restart

logs:
	@echo "Tailing logs (Ctrl+C to exit)..."
	docker compose -f $(COMPOSE_FILE) logs -f

lint:
	@echo "Linting TypeScript/JavaScript code..."
	npm run lint
	@echo "Checking Kotlin Auth Service compilation..."
	cd services/auth && ./gradlew compileKotlin

format:
	@echo "Formatting TypeScript/JavaScript code..."
	npm run format
	@echo "Formatting Go shared package..."
	gofmt -s -w packages/shared-go/
	@echo "Formatting Python shared package..."
	@if command -v black > /dev/null; then black packages/shared-python/; else echo "black not found, skipping Python formatting"; fi

test:
	@echo "Running Spring Boot tests..."
	cd services/auth && ./gradlew test

clean:
	@echo "Cleaning up generated build outputs and caches..."
	rm -rf node_modules/
	rm -rf apps/frontend/.output/ apps/frontend/.vinxi/ apps/frontend/.react-router/ apps/frontend/node_modules/
	rm -rf services/gateway/dist/ services/gateway/node_modules/
	cd services/auth && ./gradlew clean
