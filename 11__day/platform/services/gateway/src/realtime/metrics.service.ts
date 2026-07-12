import { Injectable, Logger } from "@nestjs/common";

interface MetricData {
  timestamp: number;
  value: number;
}

interface MetricHistory {
  data: MetricData[];
  maxSize: number;
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly HISTORY_SIZE = 60; // Keep last 60 data points
  
  private metrics: Map<string, MetricHistory> = new Map();
  
  // Counter metrics
  private connectedClients = 0;
  private totalConnections = 0;
  private totalDisconnections = 0;
  private totalMessages = 0;
  private totalEvents = 0;
  private totalErrors = 0;
  
  // Timing metrics
  private redisLatencySum = 0;
  private redisLatencyCount = 0;
  private kafkaLatencySum = 0;
  private kafkaLatencyCount = 0;

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    const metricNames = [
      "messages_per_second",
      "events_per_second",
      "errors_per_second",
      "redis_latency_ms",
      "kafka_latency_ms",
      "reconnect_rate",
    ];

    metricNames.forEach(name => {
      this.metrics.set(name, {
        data: [],
        maxSize: this.HISTORY_SIZE,
      });
    });

    this.logger.log("Metrics service initialized");
  }

  // Connection metrics
  incrementConnectedClients(): void {
    this.connectedClients++;
    this.totalConnections++;
  }

  decrementConnectedClients(): void {
    this.connectedClients = Math.max(0, this.connectedClients - 1);
    this.totalDisconnections++;
  }

  getConnectedClients(): number {
    return this.connectedClients;
  }

  getTotalConnections(): number {
    return this.totalConnections;
  }

  getTotalDisconnections(): number {
    return this.totalDisconnections;
  }

  // Message metrics
  incrementMessageCount(): void {
    this.totalMessages++;
    this.recordMetric("messages_per_second", 1);
  }

  getTotalMessages(): number {
    return this.totalMessages;
  }

  // Event metrics
  incrementEventCount(): void {
    this.totalEvents++;
    this.recordMetric("events_per_second", 1);
  }

  getTotalEvents(): number {
    return this.totalEvents;
  }

  // Error metrics
  incrementErrorCount(): void {
    this.totalErrors++;
    this.recordMetric("errors_per_second", 1);
  }

  getTotalErrors(): number {
    return this.totalErrors;
  }

  // Latency metrics
  recordRedisLatency(latencyMs: number): void {
    this.redisLatencySum += latencyMs;
    this.redisLatencyCount++;
    this.recordMetric("redis_latency_ms", latencyMs);
  }

  getAverageRedisLatency(): number {
    if (this.redisLatencyCount === 0) return 0;
    return this.redisLatencySum / this.redisLatencyCount;
  }

  recordKafkaLatency(latencyMs: number): void {
    this.kafkaLatencySum += latencyMs;
    this.kafkaLatencyCount++;
    this.recordMetric("kafka_latency_ms", latencyMs);
  }

  getAverageKafkaLatency(): number {
    if (this.kafkaLatencyCount === 0) return 0;
    return this.kafkaLatencySum / this.kafkaLatencyCount;
  }

  // Reconnect rate
  recordReconnect(): void {
    this.recordMetric("reconnect_rate", 1);
  }

  // Metric recording
  private recordMetric(name: string, value: number): void {
    const history = this.metrics.get(name);
    if (!history) return;

    const now = Date.now();
    history.data.push({ timestamp: now, value });

    // Keep only the last N data points
    if (history.data.length > history.maxSize) {
      history.data.shift();
    }
  }

  // Get metric history
  getMetricHistory(name: string): MetricData[] {
    const history = this.metrics.get(name);
    return history ? history.data : [];
  }

  // Calculate rate for a metric (per second over the last N seconds)
  calculateRate(name: string, windowSeconds: number = 60): number {
    const history = this.metrics.get(name);
    if (!history || history.data.length === 0) return 0;

    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    const recentData = history.data.filter(d => d.timestamp >= windowStart);
    if (recentData.length === 0) return 0;

    const sum = recentData.reduce((acc, d) => acc + d.value, 0);
    return sum / windowSeconds;
  }

  // Get average for a metric over a time window
  calculateAverage(name: string, windowSeconds: number = 60): number {
    const history = this.metrics.get(name);
    if (!history || history.data.length === 0) return 0;

    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    const recentData = history.data.filter(d => d.timestamp >= windowStart);
    if (recentData.length === 0) return 0;

    const sum = recentData.reduce((acc, d) => acc + d.value, 0);
    return sum / recentData.length;
  }

  // Get percentile for a metric
  calculatePercentile(name: string, percentile: number, windowSeconds: number = 60): number {
    const history = this.metrics.get(name);
    if (!history || history.data.length === 0) return 0;

    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    const recentData = history.data.filter(d => d.timestamp >= windowStart);
    if (recentData.length === 0) return 0;

    const sortedValues = recentData.map(d => d.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  // Get all metrics summary
  getMetricsSummary(): {
    connectedClients: number;
    totalConnections: number;
    totalDisconnections: number;
    totalMessages: number;
    totalEvents: number;
    totalErrors: number;
    messagesPerSecond: number;
    eventsPerSecond: number;
    errorsPerSecond: number;
    avgRedisLatency: number;
    avgKafkaLatency: number;
    reconnectRate: number;
  } {
    return {
      connectedClients: this.connectedClients,
      totalConnections: this.totalConnections,
      totalDisconnections: this.totalDisconnections,
      totalMessages: this.totalMessages,
      totalEvents: this.totalEvents,
      totalErrors: this.totalErrors,
      messagesPerSecond: this.calculateRate("messages_per_second", 60),
      eventsPerSecond: this.calculateRate("events_per_second", 60),
      errorsPerSecond: this.calculateRate("errors_per_second", 60),
      avgRedisLatency: this.calculateAverage("redis_latency_ms", 60),
      avgKafkaLatency: this.calculateAverage("kafka_latency_ms", 60),
      reconnectRate: this.calculateRate("reconnect_rate", 60),
    };
  }

  // Reset metrics (useful for testing)
  resetMetrics(): void {
    this.connectedClients = 0;
    this.totalConnections = 0;
    this.totalDisconnections = 0;
    this.totalMessages = 0;
    this.totalEvents = 0;
    this.totalErrors = 0;
    this.redisLatencySum = 0;
    this.redisLatencyCount = 0;
    this.kafkaLatencySum = 0;
    this.kafkaLatencyCount = 0;

    this.metrics.forEach(history => {
      history.data = [];
    });

    this.logger.log("Metrics reset");
  }
}
