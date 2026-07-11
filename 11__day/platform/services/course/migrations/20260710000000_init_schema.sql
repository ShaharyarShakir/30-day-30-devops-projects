-- +goose Up
-- SQL in this section is executed when the migration is applied.
CREATE TABLE courses (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    subtitle TEXT,
    description TEXT,
    level TEXT,
    language TEXT,
    price NUMERIC(10,2),
    thumbnail_url TEXT,
    status TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE sections (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INT NOT NULL
);

CREATE TABLE lessons (
    id UUID PRIMARY KEY,
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    duration INT,
    position INT
);

CREATE TABLE categories (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE course_categories (
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, category_id)
);

CREATE TABLE enrollments (
    id UUID PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    enrolled_at TIMESTAMP NOT NULL
);

INSERT INTO categories (id, name) VALUES
    (gen_random_uuid(), 'Development'),
    (gen_random_uuid(), 'AI'),
    (gen_random_uuid(), 'DevOps'),
    (gen_random_uuid(), 'Security'),
    (gen_random_uuid(), 'Cloud'),
    (gen_random_uuid(), 'Programming'),
    (gen_random_uuid(), 'Design')
ON CONFLICT (name) DO NOTHING;

-- +goose Down
-- SQL in this section is executed when the migration is rolled back.
DROP TABLE IF EXISTS enrollments;
DROP TABLE IF EXISTS course_categories;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS lessons;
DROP TABLE IF EXISTS sections;
DROP TABLE IF EXISTS courses;
