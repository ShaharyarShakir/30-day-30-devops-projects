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
	dvc remote modify storage endpointurl http://localhost:9000
	dvc remote modify storage access_key_id minio
	dvc remote modify storage secret_access_key minio123
