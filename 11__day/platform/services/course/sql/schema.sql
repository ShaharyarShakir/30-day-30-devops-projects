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

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY,
    aggregate_id UUID,
    aggregate_type TEXT,
    event_type TEXT,
    payload JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL,
    published_at TIMESTAMP
);

CREATE TABLE inbox_events (
    event_id UUID PRIMARY KEY,
    processed_at TIMESTAMP NOT NULL
);

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
