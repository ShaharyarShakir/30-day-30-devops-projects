export const KAFKA_TOPICS = {
  USER_EVENTS: "platform.user-events",
  COURSE_EVENTS: "platform.course-events",
  NOTIFICATION_EVENTS: "platform.notification-events"
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
