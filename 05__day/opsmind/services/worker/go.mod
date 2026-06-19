module github.com/ShaharyarShakir/opsmind-worker

go 1.26.4

require (
	github.com/jackc/pgx/v5 v5.10.0
	github.com/pgvector/pgvector-go v0.4.0
)

require (
	github.com/ShaharyarShakir/opsmind-pkg v0.0.0
	github.com/jackc/pgpassfile v1.0.0 // indirect
	github.com/jackc/pgservicefile v0.0.0-20240606120523-5a60cdf6a761 // indirect
	golang.org/x/text v0.37.0 // indirect
)

replace github.com/ShaharyarShakir/opsmind-api => ../../apps/api

replace github.com/ShaharyarShakir/opsmind-pkg => ../../pkg
