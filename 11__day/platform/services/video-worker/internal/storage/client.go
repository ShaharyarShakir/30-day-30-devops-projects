package storage

import (
	"context"
	"fmt"
	"io"
	"os"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/s3/manager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"go.uber.org/zap"
)

type Client struct {
	client *s3.Client
	bucket string
	logger *zap.Logger
}

type Config struct {
	Endpoint       string
	AccessKey      string
	SecretKey      string
	Bucket         string
	Region         string
	UseSSL         bool
	ForcePathStyle bool
}

func NewClient(cfg *Config, logger *zap.Logger) (*Client, error) {
	awsCfg, err := config.LoadDefaultConfig(context.TODO(),
		config.WithRegion(cfg.Region),
		config.WithCredentialsProvider(aws.CredentialsProviderFunc(func(ctx context.Context) (aws.Credentials, error) {
			return aws.Credentials{
				AccessKeyID:     cfg.AccessKey,
				SecretAccessKey: cfg.SecretKey,
			}, nil
		})),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(cfg.Endpoint)
		o.UsePathStyle = cfg.ForcePathStyle
	})

	return &Client{
		client: client,
		bucket: cfg.Bucket,
		logger: logger,
	}, nil
}

func (c *Client) Download(ctx context.Context, key, localPath string) error {
	c.logger.Info("Downloading file from S3",
		zap.String("key", key),
		zap.String("local_path", localPath),
	)

	resp, err := c.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("failed to get object: %w", err)
	}
	defer resp.Body.Close()

	file, err := os.Create(localPath)
	if err != nil {
		return fmt.Errorf("failed to create local file: %w", err)
	}
	defer file.Close()

	if _, err := io.Copy(file, resp.Body); err != nil {
		return fmt.Errorf("failed to copy file content: %w", err)
	}

	c.logger.Info("File downloaded successfully",
		zap.String("key", key),
		zap.String("local_path", localPath),
	)

	return nil
}

func (c *Client) Upload(ctx context.Context, key, localPath string, contentType string) error {
	c.logger.Info("Uploading file to S3",
		zap.String("key", key),
		zap.String("local_path", localPath),
	)

	file, err := os.Open(localPath)
	if err != nil {
		return fmt.Errorf("failed to open local file: %w", err)
	}
	defer file.Close()

	uploader := manager.NewUploader(c.client)
	_, err = uploader.Upload(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(c.bucket),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(contentType),
	})
	if err != nil {
		return fmt.Errorf("failed to upload object: %w", err)
	}

	c.logger.Info("File uploaded successfully",
		zap.String("key", key),
		zap.String("local_path", localPath),
	)

	return nil
}

func (c *Client) UploadDirectory(ctx context.Context, prefix, localDir string) error {
	c.logger.Info("Uploading directory to S3",
		zap.String("prefix", prefix),
		zap.String("local_dir", localDir),
	)

	uploader := manager.NewUploader(c.client)

	entries, err := os.ReadDir(localDir)
	if err != nil {
		return fmt.Errorf("failed to read directory: %w", err)
	}

	for _, entry := range entries {
		localPath := localDir + "/" + entry.Name()
		key := prefix + "/" + entry.Name()

		if entry.IsDir() {
			if err := c.UploadDirectory(ctx, key, localPath); err != nil {
				return err
			}
		} else {
			file, err := os.Open(localPath)
			if err != nil {
				return fmt.Errorf("failed to open file: %w", err)
			}

			contentType := "application/octet-stream"
			if len(entry.Name()) > 4 {
				switch entry.Name()[len(entry.Name())-4:] {
				case ".m3u8":
					contentType = "application/vnd.apple.mpegurl"
				case ".ts":
					contentType = "video/mp2t"
				case ".jpg", "jpeg":
					contentType = "image/jpeg"
				case ".png":
					contentType = "image/png"
				}
			}

			_, err = uploader.Upload(ctx, &s3.PutObjectInput{
				Bucket:      aws.String(c.bucket),
				Key:         aws.String(key),
				Body:        file,
				ContentType: aws.String(contentType),
			})
			file.Close()

			if err != nil {
				return fmt.Errorf("failed to upload file %s: %w", entry.Name(), err)
			}
		}
	}

	return nil
}

func (c *Client) Delete(ctx context.Context, key string) error {
	c.logger.Info("Deleting file from S3", zap.String("key", key))

	_, err := c.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(c.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("failed to delete object: %w", err)
	}

	return nil
}

func (c *Client) DeletePrefix(ctx context.Context, prefix string) error {
	c.logger.Info("Deleting prefix from S3", zap.String("prefix", prefix))

	listResp, err := c.client.ListObjectsV2(ctx, &s3.ListObjectsV2Input{
		Bucket: aws.String(c.bucket),
		Prefix: aws.String(prefix),
	})
	if err != nil {
		return fmt.Errorf("failed to list objects: %w", err)
	}

	for _, obj := range listResp.Contents {
		if err := c.Delete(ctx, *obj.Key); err != nil {
			return err
		}
	}

	return nil
}
