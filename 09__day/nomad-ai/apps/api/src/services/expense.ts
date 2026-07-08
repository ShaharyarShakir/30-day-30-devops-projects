import { ExpenseRepository } from "../repositories/expense.js";
import { TripRepository } from "../repositories/trip.js";
import { NotificationRepository } from "../repositories/notification.js";
import { broadcastToTrip } from "../websocket/server.js";

export class ExpenseService {
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

  static async createExpense(userId: string, tripId: string, data: any) {
    const trip = await this.verifyTripMembership(userId, tripId);
    const expense = await ExpenseRepository.create(tripId, userId, data);

    // Send notifications to other trip members
    const otherMembers = trip.members.filter((m: any) => m._id.toString() !== userId);
    for (const member of otherMembers) {
      await NotificationRepository.create(member._id.toString(), {
        title: "💵 Expense Added",
        body: `A new expense of ${expense.amount} ${expense.currency} (${expense.category}) was added to "${trip.title}".`,
        type: "expense_added",
      });
    }

    // Broadcast WebSocket event
    broadcastToTrip(tripId, {
      event: "EXPENSE_ADDED",
      payload: { tripId, expenseId: expense._id.toString(), amount: expense.amount, category: expense.category },
    });

    return expense;
  }

  static async getExpenses(userId: string, tripId: string, filters: any) {
    await this.verifyTripMembership(userId, tripId);
    return await ExpenseRepository.findManyByTripId(tripId, filters);
  }

  static async updateExpense(userId: string, id: string, data: any) {
    const expense = await ExpenseRepository.findById(id);
    if (!expense) {
      throw new Error("Expense not found.");
    }
    await this.verifyTripMembership(userId, expense.tripId.toString());
    const updated = await ExpenseRepository.update(id, data);

    broadcastToTrip(expense.tripId.toString(), {
      event: "TRIP_UPDATED",
      payload: { tripId: expense.tripId.toString(), eventType: "expense_updated", expenseId: id },
    });

    return updated;
  }

  static async deleteExpense(userId: string, id: string) {
    const expense = await ExpenseRepository.findById(id);
    if (!expense) {
      throw new Error("Expense not found.");
    }
    await this.verifyTripMembership(userId, expense.tripId.toString());
    const success = await ExpenseRepository.delete(id);

    if (success) {
      broadcastToTrip(expense.tripId.toString(), {
        event: "TRIP_UPDATED",
        payload: { tripId: expense.tripId.toString(), eventType: "expense_deleted", expenseId: id },
      });
    }

    return success;
  }

  static async getBudgetSummary(userId: string, tripId: string) {
    await this.verifyTripMembership(userId, tripId);
    return await ExpenseRepository.getBudgetSummary(tripId);
  }
}
