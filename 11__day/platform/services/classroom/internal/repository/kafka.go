package repository

import "context"

type KafkaProducer struct{}

func NewKafkaProducer(_ string) (*KafkaProducer, error) { return &KafkaProducer{}, nil }

func (k *KafkaProducer) Publish(_ context.Context, _ string, _ interface{}) error { return nil }

func (k *KafkaProducer) Close() {}
