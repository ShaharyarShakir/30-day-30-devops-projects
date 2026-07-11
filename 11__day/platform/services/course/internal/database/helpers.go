package database

import (
	"fmt"
	"math"
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

// IntPtrToPg converts a *int to pgtype.Int4
func IntPtrToPg(i *int) pgtype.Int4 {
	if i == nil {
		return pgtype.Int4{Valid: false}
	}
	return pgtype.Int4{Int32: int32(*i), Valid: true}
}

// PgToIntPtr converts a pgtype.Int4 to *int
func PgToIntPtr(pg pgtype.Int4) *int {
	if !pg.Valid {
		return nil
	}
	val := int(pg.Int32)
	return &val
}

// TimeToPg converts a time.Time to pgtype.Timestamp
func TimeToPg(t time.Time) pgtype.Timestamp {
	return pgtype.Timestamp{Time: t, Valid: true}
}

// PgToTime converts a pgtype.Timestamp to time.Time
func PgToTime(pg pgtype.Timestamp) time.Time {
	if !pg.Valid {
		return time.Time{}
	}
	return pg.Time
}

// Float64PtrToPgNumeric converts a *float64 to pgtype.Numeric
func Float64PtrToPgNumeric(f *float64) pgtype.Numeric {
	var n pgtype.Numeric
	if f == nil {
		return n
	}
	_ = n.Scan(fmt.Sprintf("%.2f", *f))
	return n
}

// PgNumericToFloat64Ptr converts a pgtype.Numeric to *float64
func PgNumericToFloat64Ptr(n pgtype.Numeric) *float64 {
	if !n.Valid {
		return nil
	}
	if n.Int == nil {
		return nil
	}
	f := float64(n.Int.Int64())
	if n.Exp < 0 {
		f = f / math.Pow10(-int(n.Exp))
	} else if n.Exp > 0 {
		f = f * math.Pow10(int(n.Exp))
	}
	return &f
}
