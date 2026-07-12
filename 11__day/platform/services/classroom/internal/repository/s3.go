package repository

import "context"

type S3Client struct{ Bucket string }

func NewS3Client(_, _, _, bucket string) *S3Client { return &S3Client{Bucket: bucket} }

func (s *S3Client) PutObject(_ context.Context, _ string, _ string) error { return nil }
