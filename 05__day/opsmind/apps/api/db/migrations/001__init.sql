-- +goose Up


CREATE EXTENSION IF NOT EXISTS vector;


CREATE TABLE documents (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title TEXT NOT NULL,

    filename TEXT NOT NULL,

    content_type TEXT,

    created_at TIMESTAMP DEFAULT NOW()

);



CREATE TABLE chunks (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    document_id UUID NOT NULL REFERENCES documents(id)
    ON DELETE CASCADE,

    content TEXT NOT NULL,

    embedding vector(1536),

    created_at TIMESTAMP DEFAULT NOW()

);



CREATE INDEX chunks_embedding_idx

ON chunks

USING ivfflat (embedding vector_cosine_ops);



-- +goose Down


DROP TABLE chunks;

DROP TABLE documents;