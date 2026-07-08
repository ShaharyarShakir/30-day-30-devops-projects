import { DestinationRepository } from "../repositories/destination.js";
import { TripRepository } from "../repositories/trip.js";
import { broadcastToTrip } from "../websocket/server.js";

export class DestinationService {
  private static async verifyTripMembership(userId: string, tripId: string) {
    const trip = await TripRepository.findById(tripId);
    if (!trip) {
      throw new Error("Trip not found.");
    }
    const isMember = trip.owner.toString() === userId || trip.members.some((m: any) => m._id.toString() === userId);
    if (!isMember) {
      throw new Error("Unauthorized access to this trip.");
    }
  }

  static async createDestination(userId: string, tripId: string, data: any) {
    await this.verifyTripMembership(userId, tripId);
    const destination = await DestinationRepository.create(tripId, data);

    // Notify other members
    broadcastToTrip(tripId, {
      event: "TRIP_UPDATED",
      payload: { tripId, eventType: "destination_added", destinationName: destination.name },
    });

    return destination;
  }

  static async getDestinations(userId: string, tripId: string) {
    await this.verifyTripMembership(userId, tripId);
    return await DestinationRepository.findManyByTripId(tripId);
  }

  static async updateDestination(userId: string, id: string, data: any) {
    const destination = await DestinationRepository.findById(id);
    if (!destination) {
      throw new Error("Destination not found.");
    }
    await this.verifyTripMembership(userId, destination.tripId.toString());
    const updated = await DestinationRepository.update(id, data);

    broadcastToTrip(destination.tripId.toString(), {
      event: "TRIP_UPDATED",
      payload: { tripId: destination.tripId.toString(), eventType: "destination_updated", destinationName: updated?.name },
    });

    return updated;
  }

  static async deleteDestination(userId: string, id: string) {
    const destination = await DestinationRepository.findById(id);
    if (!destination) {
      throw new Error("Destination not found.");
    }
    await this.verifyTripMembership(userId, destination.tripId.toString());
    const success = await DestinationRepository.delete(id);

    if (success) {
      broadcastToTrip(destination.tripId.toString(), {
        event: "TRIP_UPDATED",
        payload: { tripId: destination.tripId.toString(), eventType: "destination_deleted" },
      });
    }

    return success;
  }

  static async reorderDestinations(userId: string, tripId: string, destinationIds: string[]) {
    await this.verifyTripMembership(userId, tripId);
    const updated = await DestinationRepository.reorder(tripId, destinationIds);

    broadcastToTrip(tripId, {
      event: "TRIP_UPDATED",
      payload: { tripId, eventType: "destinations_reordered" },
    });

    return updated;
  }
}
