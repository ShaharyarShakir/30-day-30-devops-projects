import { NotificationRepository } from "../repositories/notification.js";

export class NotificationService {
  static async getNotifications(userId: string, filters: any) {
    return await NotificationRepository.findManyByUserId(userId, filters);
  }

  static async markAsRead(userId: string, id: string) {
    const notification = await NotificationRepository.markAsRead(id);
    if (!notification) {
      throw new Error("Notification not found.");
    }
    if (notification.userId.toString() !== userId) {
      throw new Error("Unauthorized to access this notification.");
    }
    return notification;
  }

  static async deleteNotification(userId: string, id: string) {
    const notification = await NotificationRepository.markAsRead(id);
    if (!notification) {
      throw new Error("Notification not found.");
    }
    if (notification.userId.toString() !== userId) {
      throw new Error("Unauthorized to access this notification.");
    }
    return await NotificationRepository.delete(id);
  }
}
