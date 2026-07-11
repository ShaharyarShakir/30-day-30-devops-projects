-- name: CreateCourse :one
INSERT INTO courses (id, owner_id, title, slug, subtitle, description, level, language, price, thumbnail_url, status, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
RETURNING *;

-- name: GetCourseByID :one
SELECT * FROM courses WHERE id = $1;

-- name: GetCourseBySlug :one
SELECT * FROM courses WHERE slug = $1;

-- name: UpdateCourse :one
UPDATE courses
SET title = $2, slug = $3, subtitle = $4, description = $5, level = $6, language = $7, price = $8, thumbnail_url = $9, status = $10, updated_at = $11
WHERE id = $1
RETURNING *;

-- name: DeleteCourse :exec
DELETE FROM courses WHERE id = $1;

-- name: ListCourses :many
SELECT * FROM courses
ORDER BY created_at DESC;

-- name: ListCoursesByOwner :many
SELECT * FROM courses
WHERE owner_id = $1
ORDER BY created_at DESC;

-- name: ListPublishedCourses :many
SELECT * FROM courses
WHERE status = 'PUBLISHED'
ORDER BY created_at DESC;

-- name: CreateSection :one
INSERT INTO sections (id, course_id, title, position)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetSectionByID :one
SELECT * FROM sections WHERE id = $1;

-- name: ListSectionsByCourseID :many
SELECT * FROM sections WHERE course_id = $1 ORDER BY position ASC;

-- name: UpdateSection :one
UPDATE sections
SET title = $2, position = $3
WHERE id = $1
RETURNING *;

-- name: DeleteSection :exec
DELETE FROM sections WHERE id = $1;

-- name: CreateLesson :one
INSERT INTO lessons (id, section_id, title, type, duration, position)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetLessonByID :one
SELECT * FROM lessons WHERE id = $1;

-- name: ListLessonsBySectionID :many
SELECT * FROM lessons WHERE section_id = $1 ORDER BY position ASC;

-- name: UpdateLesson :one
UPDATE lessons
SET title = $2, type = $3, duration = $4, position = $5
WHERE id = $1
RETURNING *;

-- name: DeleteLesson :exec
DELETE FROM lessons WHERE id = $1;

-- name: CreateEnrollment :one
INSERT INTO enrollments (id, course_id, user_id, enrolled_at)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetEnrollment :one
SELECT * FROM enrollments WHERE course_id = $1 AND user_id = $2;

-- name: ListEnrollmentsByUserID :many
SELECT e.*, c.title as course_title, c.slug as course_slug, c.thumbnail_url as course_thumbnail_url
FROM enrollments e
JOIN courses c ON e.course_id = c.id
WHERE e.user_id = $1
ORDER BY e.enrolled_at DESC;

-- name: ListCategories :many
SELECT * FROM categories ORDER BY name ASC;

-- name: GetCategoryByName :one
SELECT * FROM categories WHERE name = $1;

-- name: AddCourseCategory :exec
INSERT INTO course_categories (course_id, category_id)
VALUES ($1, $2)
ON CONFLICT DO NOTHING;

-- name: ClearCourseCategories :exec
DELETE FROM course_categories WHERE course_id = $1;

-- name: ListCategoriesByCourseID :many
SELECT c.* FROM categories c
JOIN course_categories cc ON c.id = cc.category_id
WHERE cc.course_id = $1
ORDER BY c.name ASC;

-- name: InsertOutboxEvent :exec
INSERT INTO outbox_events (id, aggregate_id, aggregate_type, event_type, payload, created_at)
VALUES ($1, $2, $3, $4, $5, $6);

-- name: ListUnpublishedOutboxEvents :many
SELECT * FROM outbox_events
WHERE published_at IS NULL
ORDER BY created_at ASC
LIMIT $1;

-- name: MarkOutboxEventAsPublished :exec
UPDATE outbox_events
SET published_at = $2
WHERE id = $1;

-- name: InsertInboxEvent :exec
INSERT INTO inbox_events (event_id, processed_at)
VALUES ($1, $2)
ON CONFLICT (event_id) DO NOTHING;

-- name: GetInboxEvent :one
SELECT * FROM inbox_events WHERE event_id = $1;

-- name: CreateObjective :one
INSERT INTO course_objectives (id, course_id, objective, position)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ClearObjectives :exec
DELETE FROM course_objectives WHERE course_id = $1;

-- name: ListObjectivesByCourseID :many
SELECT * FROM course_objectives WHERE course_id = $1 ORDER BY position ASC;

-- name: CreateRequirement :one
INSERT INTO course_requirements (id, course_id, requirement, position)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ClearRequirements :exec
DELETE FROM course_requirements WHERE course_id = $1;

-- name: ListRequirementsByCourseID :many
SELECT * FROM course_requirements WHERE course_id = $1 ORDER BY position ASC;

-- name: CreateTarget :one
INSERT INTO course_targets (id, course_id, target, position)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: ClearTargets :exec
DELETE FROM course_targets WHERE course_id = $1;

-- name: ListTargetsByCourseID :many
SELECT * FROM course_targets WHERE course_id = $1 ORDER BY position ASC;

-- name: CreateLessonResource :one
INSERT INTO lesson_resources (id, lesson_id, title, url, type, created_at)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: ListResourcesByLessonID :many
SELECT * FROM lesson_resources WHERE lesson_id = $1 ORDER BY created_at ASC;

-- name: DeleteLessonResource :exec
DELETE FROM lesson_resources WHERE id = $1;

-- name: SetLessonOrder :one
INSERT INTO lesson_order (section_id, ordered_ids)
VALUES ($1, $2)
ON CONFLICT (section_id) DO UPDATE SET ordered_ids = EXCLUDED.ordered_ids
RETURNING *;

-- name: GetLessonOrder :one
SELECT * FROM lesson_order WHERE section_id = $1;
