.PHONY: up down restart logs status clean dvc-init

up:
	docker compose up -d --build

down:
	docker compose down

restart:
	docker compose down
	docker compose up -d --build

logs:
	docker compose logs -f

status:
	docker compose ps

clean:
	docker compose down -v

dvc-init:
	dvc init
	mkdir -p ml/datasets/raw ml/datasets/processed
	dvc remote add -d storage s3://datasets
	dvc remote modify storage endpointurl http://localhost:3900
	dvc remote modify storage access_key_id GK3515373e4c851ebaad366558
	dvc remote modify storage secret_access_key 7d37d093435a41f2aab8f13c19ba067d9776c90215f56614adad6ece597dbb34
