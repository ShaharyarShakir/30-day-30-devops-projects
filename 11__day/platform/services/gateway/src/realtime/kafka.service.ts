import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Kafka, Producer } from "kafkajs";

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;

  constructor(private readonly configService: ConfigService) {
    const broker = this.configService.get<string>("KAFKA_BROKER") || "localhost:9092";
    this.kafka = new Kafka({
      clientId: "realtime-gateway",
      brokers: [broker],
    });
    this.producer = this.kafka.producer();
  }

  async onModuleInit() {
    try {
      await this.producer.connect();
      this.logger.log("Successfully connected Kafka Producer.");
    } catch (err) {
      this.logger.error("Failed to connect Kafka Producer", err.stack);
    }
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
  }

  async emitEvent(topic: string, key: string, payload: any): Promise<void> {
    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key,
            value: JSON.stringify({
              occurredAt: new Date().toISOString(),
              source: "realtime-gateway",
              ...payload,
            }),
          },
        ],
      });
      this.logger.log(`Published Kafka event to ${topic} with key ${key}`);
    } catch (err) {
      this.logger.error(`Failed to publish Kafka event to ${topic}`, err.stack);
    }
  }
}
