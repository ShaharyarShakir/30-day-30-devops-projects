import { JournalRepository } from "../repositories/journal.js";
import { TripRepository } from "../repositories/trip.js";
import { broadcastToTrip } from "../websocket/server.js";

export class JournalService {
  private static async verifyTripMembership(userId: string, tripId: string) {
    const trip = await TripRepository.findById(tripId);
    if (!trip) {
      throw new Error("Trip not found.");
    }
    const isMember = trip.owner.toString() === userId || trip.members.some((m: any) => m._id.toString() === userId);
    if (!isMember) {
      throw new Error("Unauthorized access to this trip.");
    }
    return trip;
  }

  static async createJournal(userId: string, tripId: string, data: any) {
    await this.verifyTripMembership(userId, tripId);
    const journal = await JournalRepository.create(tripId, userId, data);

    // Notify other members via WebSocket
    broadcastToTrip(tripId, {
      event: "JOURNAL_ADDED",
      payload: { tripId, journalId: journal._id.toString(), title: journal.title },
    });

    return journal;
  }

  static async getJournals(userId: string, tripId: string, filters: any) {
    await this.verifyTripMembership(userId, tripId);
    return await JournalRepository.findManyByTripId(tripId, filters);
  }

  static async updateJournal(userId: string, id: string, data: any) {
    const journal = await JournalRepository.findById(id);
    if (!journal) {
      throw new Error("Journal entry not found.");
    }
    await this.verifyTripMembership(userId, journal.tripId.toString());
    const updated = await JournalRepository.update(id, data);

    broadcastToTrip(journal.tripId.toString(), {
      event: "TRIP_UPDATED",
      payload: { tripId: journal.tripId.toString(), eventType: "journal_updated", journalId: id },
    });

    return updated;
  }

  static async deleteJournal(userId: string, id: string) {
    const journal = await JournalRepository.findById(id);
    if (!journal) {
      throw new Error("Journal entry not found.");
    }
    await this.verifyTripMembership(userId, journal.tripId.toString());
    const success = await JournalRepository.delete(id);

    if (success) {
      broadcastToTrip(journal.tripId.toString(), {
        event: "TRIP_UPDATED",
        payload: { tripId: journal.tripId.toString(), eventType: "journal_deleted", journalId: id },
      });
    }

    return success;
  }
}
