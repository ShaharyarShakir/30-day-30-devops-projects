import { TripModel, type ITrip } from "../db/core-models.js";

export class TripRepository {
  static async create(ownerId: string, data: any): Promise<ITrip> {
    return await TripModel.create({
      ...data,
      owner: ownerId,
      members: [ownerId], // Owner is automatically a member
    });
  }

  static async findById(id: string): Promise<ITrip | null> {
    return await TripModel.findById(id).populate("owner", "name email image").populate("members", "name email image");
  }

  static async findUserTrips(
    userId: string,
    filters: {
      search?: string;
      country?: string;
      status?: "planning" | "active" | "completed";
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ trips: ITrip[]; total: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const query: any = {
      $or: [{ owner: userId }, { members: userId }],
    };

    if (filters.search) {
      query.title = { $regex: filters.search, $options: "i" };
    }

    if (filters.country) {
      query.country = { $regex: filters.country, $options: "i" };
    }

    if (filters.status) {
      query.status = filters.status;
    }

    const total = await TripModel.countDocuments(query);
    const trips = await TripModel.find(query)
      .populate("owner", "name email image")
      .sort({ startDate: 1 })
      .skip(skip)
      .limit(limit);

    return { trips, total };
  }

  static async update(id: string, data: any): Promise<ITrip | null> {
    return await TripModel.findByIdAndUpdate(id, data, { new: true })
      .populate("owner", "name email image")
      .populate("members", "name email image");
  }

  static async delete(id: string): Promise<boolean> {
    const result = await TripModel.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  static async addMember(id: string, memberId: string): Promise<ITrip | null> {
    return await TripModel.findByIdAndUpdate(
      id,
      { $addToSet: { members: memberId } },
      { new: true }
    )
      .populate("owner", "name email image")
      .populate("members", "name email image");
  }

  static async removeMember(id: string, memberId: string): Promise<ITrip | null> {
    return await TripModel.findByIdAndUpdate(
      id,
      { $pull: { members: memberId } },
      { new: true }
    )
      .populate("owner", "name email image")
      .populate("members", "name email image");
  }
}
