package database

import (
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

// UUIDToPg converts a google/uuid.UUID to pgtype.UUID
func UUIDToPg(id uuid.UUID) pgtype.UUID {
	return pgtype.UUID{Bytes: id, Valid: true}
}

// StringToPgUUID converts a string to pgtype.UUID
func StringToPgUUID(s string) pgtype.UUID {
	var res pgtype.UUID
	_ = res.Scan(s)
	return res
}

// PgToUUID converts a pgtype.UUID to google/uuid.UUID
func PgToUUID(pg pgtype.UUID) uuid.UUID {
	if !pg.Valid {
		return uuid.Nil
	}
	return pg.Bytes
}

// StringPtrToPg converts a *string to pgtype.Text
func StringPtrToPg(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: *s, Valid: true}
}

// PgToStringPtr converts a pgtype.Text to *string
func PgToStringPtr(pg pgtype.Text) *string {
	if !pg.Valid {
		return nil
	}
	return &pg.String
}

// TimeToPg converts a time.Time to pgtype.Timestamp
func TimeToPg(t time.Time) pgtype.Timestamp {
	return pgtype.Timestamp{Time: t, Valid: true}
}

// TimePtrToPg converts a *time.Time to pgtype.Timestamp
func TimePtrToPg(t *time.Time) pgtype.Timestamp {
	if t == nil {
		return pgtype.Timestamp{Valid: false}
	}
	return pgtype.Timestamp{Time: *t, Valid: true}
}

// PgToTime converts a pgtype.Timestamp to time.Time
func PgToTime(pg pgtype.Timestamp) time.Time {
	if !pg.Valid {
		return time.Time{}
	}
	return pg.Time
}

// PgToTimePtr converts a pgtype.Timestamp to *time.Time
func PgToTimePtr(pg pgtype.Timestamp) *time.Time {
	if !pg.Valid {
		return nil
	}
	t := pg.Time
	return &t
}
