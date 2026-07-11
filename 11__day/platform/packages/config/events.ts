export const EVENTS = {
  USER: {
    CREATED: "user.created",
    UPDATED: "user.updated",
    DELETED: "user.deleted"
  },
  COURSE: {
    CREATED: "course.created",
    UPDATED: "course.updated",
    DELETED: "course.deleted"
  },
  AUTH: {
    LOGIN: "auth.login",
    LOGOUT: "auth.logout",
    REGISTER: "auth.register"
  }
} as const;

export type EventRegistry = typeof EVENTS;
