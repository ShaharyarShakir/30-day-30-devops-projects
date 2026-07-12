export const PORTS = {
  // Applications and Services
  frontend: 3000,
  gateway: 4000,
  auth: 5000,
  user: 5001,
  course: 5002,
  media: 5003,
  chat: 5004,
  liveSession: 5005,
  notification: 5006,
  search: 5007,

  // Infrastructure Services
  postgres: 5432,
  mongodb: 27017,
  redis: 6379,
  kafka: 9092,
  kafkaUi: 8081,
  garageS3: 3900,
  garageWeb: 3902,
  garageAdmin: 3903,
  mailpitSmtp: 1025,
  mailpitUi: 8025,
  liveKit: 7880,
  liveKitHttp: 7881,
  liveKitUdp: 7882,

  // Observability
  prometheus: 9090,
  grafana: 3200,
  loki: 3100,
  jaegerUi: 16686
} as const;

export type ServiceName = keyof typeof PORTS;
