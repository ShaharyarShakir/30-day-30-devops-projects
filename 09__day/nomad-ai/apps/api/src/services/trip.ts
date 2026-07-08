import { TripRepository } from "../repositories/trip.js";
import { UserModel } from "../db/models.js";
import { NotificationRepository } from "../repositories/notification.js";
import { broadcastToTrip } from "../websocket/server.js";

export class TripService {
  static async createTrip(ownerId: string, data: any) {
    return await TripRepository.create(ownerId, data);
  }

  static async getTrip(userId: string, tripId: string) {
    const trip = await TripRepository.findById(tripId);
    if (!trip) {
      throw new Error("Trip not found.");
    }

    // Verify user is owner or member
    const isMember = trip.owner.toString() === userId || trip.members.some((m: any) => m._id.toString() === userId);
    if (!isMember && trip.visibility === "private") {
      throw new Error("Unauthorized to access this trip.");
    }

    return trip;
  }

  static async getTrips(
    userId: string,
    filters: { search?: string; country?: string; status?: "planning" | "active" | "completed"; page?: number; limit?: number }
  ) {
    return await TripRepository.findUserTrips(userId, filters);
  }

  static async updateTrip(userId: string, tripId: string, data: any) {
    const trip = await TripRepository.findById(tripId);
    if (!trip) {
      throw new Error("Trip not found.");
    }

    // Check permissions (members can update trip info, or only owner? Let's allow members as it is collaborative)
    const isMember = trip.owner.toString() === userId || trip.members.some((m: any) => m._id.toString() === userId);
    if (!isMember) {
      throw new Error("Unauthorized to edit this trip.");
    }

    const updatedTrip = await TripRepository.update(tripId, data);

    // Notify other members via WebSocket
    broadcastToTrip(tripId, {
      event: "TRIP_UPDATED",
      payload: { tripId, updatedBy: userId, title: updatedTrip?.title },
    });

    return updatedTrip;
  }

  static async deleteTrip(userId: string, tripId: string) {
    const trip = await TripRepository.findById(tripId);
    if (!trip) {
      throw new Error("Trip not found.");
    }

    // Only owner can delete
    if (trip.owner.toString() !== userId) {
      throw new Error("Only the owner can delete this trip.");
    }

    return await TripRepository.delete(tripId);
  }

  static async inviteMember(userId: string, tripId: string, memberEmail: string) {
    const trip = await TripRepository.findById(tripId);
    if (!trip) {
      throw new Error("Trip not found.");
    }

    // Only owner can invite
    if (trip.owner.toString() !== userId) {
      throw new Error("Only the owner can invite members.");
    }

    // Find the invited user by email
    const invitedUser = await UserModel.findOne({ email: memberEmail });
    if (!invitedUser) {
      throw new Error("Invited user account not found.");
    }

    const updatedTrip = await TripRepository.addMember(tripId, invitedUser._id.toString());

    await NotificationRepository.create(invitedUser._id.toString(), {
      title: "✈️ Invited to Trip",
      body: `You have been added to the trip "${trip.title}" by ${(trip.owner as any).name}.`,
      type: "member_joined",
    });

    // Notify other members via WebSocket
    broadcastToTrip(tripId, {
      event: "MEMBER_JOINED",
      payload: { tripId, member: { id: invitedUser._id.toString(), name: invitedUser.name } },
    });

    return updatedTrip;
  }
}
