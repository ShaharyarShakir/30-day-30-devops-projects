-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE TABLE course_objectives (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    objective TEXT NOT NULL,
    position INT NOT NULL
);

CREATE TABLE course_requirements (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    requirement TEXT NOT NULL,
    position INT NOT NULL
);

CREATE TABLE course_targets (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    target TEXT NOT NULL,
    position INT NOT NULL
);

CREATE TABLE lesson_resources (
    id UUID PRIMARY KEY,
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE lesson_order (
    section_id UUID PRIMARY KEY REFERENCES sections(id) ON DELETE CASCADE,
    ordered_ids UUID[] NOT NULL
);

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP TABLE IF EXISTS lesson_order;
DROP TABLE IF EXISTS lesson_resources;
DROP TABLE IF EXISTS course_targets;
DROP TABLE IF EXISTS course_requirements;
DROP TABLE IF EXISTS course_objectives;
