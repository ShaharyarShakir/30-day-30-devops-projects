import { DestinationModel, type IDestination } from "../db/core-models.js";

export class DestinationRepository {
  static async create(tripId: string, data: any): Promise<IDestination> {
    // Get the maximum order value to automatically set next order if not provided
    if (data.order === undefined) {
      const lastDest = await DestinationModel.findOne({ tripId }).sort({ order: -1 });
      data.order = lastDest ? lastDest.order + 1 : 0;
    }
    return await DestinationModel.create({ ...data, tripId });
  }

  static async findManyByTripId(tripId: string): Promise<IDestination[]> {
    return await DestinationModel.find({ tripId }).sort({ order: 1 });
  }

  static async findById(id: string): Promise<IDestination | null> {
    return await DestinationModel.findById(id);
  }

  static async update(id: string, data: any): Promise<IDestination | null> {
    return await DestinationModel.findByIdAndUpdate(id, data, { new: true });
  }

  static async delete(id: string): Promise<boolean> {
    const result = await DestinationModel.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  static async deleteByTripId(tripId: string): Promise<void> {
    await DestinationModel.deleteMany({ tripId });
  }

  static async reorder(tripId: string, destinationIds: string[]): Promise<IDestination[]> {
    const promises = destinationIds.map((id, index) =>
      DestinationModel.findByIdAndUpdate(id, { order: index }, { new: true })
    );
    await Promise.all(promises);
    return this.findManyByTripId(tripId);
  }
}
