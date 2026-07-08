import { NotificationModel, type INotification } from "../db/core-models.js";

export class NotificationRepository {
  static async create(userId: string, data: any): Promise<INotification> {
    return await NotificationModel.create({ ...data, userId });
  }

  static async findManyByUserId(
    userId: string,
    filters: { page?: number; limit?: number } = {}
  ): Promise<{ notifications: INotification[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const query = { userId };
    const total = await NotificationModel.countDocuments(query);
    const notifications = await NotificationModel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return { notifications, total };
  }

  static async markAsRead(id: string): Promise<INotification | null> {
    return await NotificationModel.findByIdAndUpdate(id, { read: true }, { new: true });
  }

  static async delete(id: string): Promise<boolean> {
    const result = await NotificationModel.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }
}
