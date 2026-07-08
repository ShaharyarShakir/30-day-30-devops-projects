import { JournalModel, type IJournal } from "../db/core-models.js";

export class JournalRepository {
  static async create(tripId: string, userId: string, data: any): Promise<IJournal> {
    return await JournalModel.create({ ...data, tripId, userId });
  }

  static async findManyByTripId(
    tripId: string,
    filters: { page?: number; limit?: number } = {}
  ): Promise<{ journals: IJournal[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const query = { tripId };
    const total = await JournalModel.countDocuments(query);
    const journals = await JournalModel.find(query)
      .populate("userId", "name email image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return { journals, total };
  }

  static async findById(id: string): Promise<IJournal | null> {
    return await JournalModel.findById(id).populate("userId", "name email image");
  }

  static async update(id: string, data: any): Promise<IJournal | null> {
    return await JournalModel.findByIdAndUpdate(id, data, { new: true }).populate("userId", "name email image");
  }

  static async delete(id: string): Promise<boolean> {
    const result = await JournalModel.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  static async deleteByTripId(tripId: string): Promise<void> {
    await JournalModel.deleteMany({ tripId });
  }
}
