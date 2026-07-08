import { ExpenseModel, type IExpense } from "../db/core-models.js";

export class ExpenseRepository {
  static async create(tripId: string, userId: string, data: any): Promise<IExpense> {
    return await ExpenseModel.create({ ...data, tripId, userId });
  }

  static async findManyByTripId(
    tripId: string,
    filters: { category?: string; page?: number; limit?: number } = {}
  ): Promise<{ expenses: IExpense[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const query: any = { tripId };
    if (filters.category) {
      query.category = filters.category;
    }

    const total = await ExpenseModel.countDocuments(query);
    const expenses = await ExpenseModel.find(query)
      .populate("userId", "name email image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return { expenses, total };
  }

  static async findById(id: string): Promise<IExpense | null> {
    return await ExpenseModel.findById(id).populate("userId", "name email image");
  }

  static async update(id: string, data: any): Promise<IExpense | null> {
    return await ExpenseModel.findByIdAndUpdate(id, data, { new: true }).populate("userId", "name email image");
  }

  static async delete(id: string): Promise<boolean> {
    const result = await ExpenseModel.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  static async deleteByTripId(tripId: string): Promise<void> {
    await ExpenseModel.deleteMany({ tripId });
  }

  static async getBudgetSummary(tripId: string): Promise<{ category: string; total: number }[]> {
    return await ExpenseModel.aggregate([
      { $match: { tripId: new ExpenseModel.base.Types.ObjectId(tripId) } },
      {
        $group: {
          _id: "$category",
          total: { $sum: "$amount" },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          total: 1,
        },
      },
    ]);
  }
}
