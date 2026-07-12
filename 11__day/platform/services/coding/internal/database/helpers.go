package database

import (
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

func UUIDToPg(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

func StringToPgUUID(s string) pgtype.UUID {
	var res pgtype.UUID
	_ = res.Scan(s)
	return res
}

func PgToUUID(pg pgtype.UUID) uuid.UUID {
	if !pg.Valid {
		return uuid.Nil
	}
	return pg.Bytes
}

func StringPtrToPg(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: *s, Valid: true}
}

func PgToStringPtr(pg pgtype.Text) *string {
	if !pg.Valid {
		return nil
	}
	return &pg.String
}

func TimeToPg(t time.Time) pgtype.Timestamp {
	return pgtype.Timestamp{Time: t, Valid: true}
}

func TimePtrToPg(t *time.Time) pgtype.Timestamp {
	if t == nil {
		return pgtype.Timestamp{Valid: false}
	}
	return pgtype.Timestamp{Time: *t, Valid: true}
}

func PgToTime(pg pgtype.Timestamp) time.Time {
	if !pg.Valid {
		return time.Time{}
	}
	return pg.Time
}

func PgToTimePtr(pg pgtype.Timestamp) *time.Time {
	if !pg.Valid {
		return nil
	}
	t := pg.Time
	return &t
}
