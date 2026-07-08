import { Hono } from "hono";
import mongoose from "mongoose";
import { authMiddleware, type AuthContextVariables } from "../auth/middleware.js";
import { ExpenseModel, TripModel } from "../db/core-models.js";

const expensesSocialRouter = new Hono<{ Variables: AuthContextVariables }>();

expensesSocialRouter.use("*", authMiddleware);

// GET /:tripId/settlements - Calculate individual contributions, debts, and settlement suggestions
expensesSocialRouter.get("/:tripId/settlements", async (c) => {
  const tripId = c.req.param("tripId");

  try {
    const trip = await TripModel.findById(tripId)
      .populate("owner", "name email image")
      .populate("members", "name email image");
      
    if (!trip) {
      return c.json({ success: false, error: "Trip not found." }, 404);
    }

    const allMembers = [trip.owner, ...trip.members];
    const memberCount = allMembers.length;
    if (memberCount === 0) {
      return c.json({ 
        success: true, 
        data: { totalSpent: 0, sharePerMember: 0, budgetRemaining: trip.budget, contributions: [], settlements: [] } 
      });
    }

    // Fetch expenses
    const expenses = await ExpenseModel.find({ tripId: new mongoose.Types.ObjectId(tripId) });
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const budgetRemaining = Math.max(0, trip.budget - totalSpent);

    // Paid amount per user map
    const paidPerUser: Record<string, number> = {};
    allMembers.forEach((m: any) => {
      paidPerUser[m._id.toString()] = 0;
    });

    expenses.forEach((e) => {
      const payerId = e.userId.toString();
      paidPerUser[payerId] = (paidPerUser[payerId] || 0) + e.amount;
    });

    // Share per member
    const share = totalSpent / memberCount;
    
    // Set up balances
    const balances: Array<{ userId: string; name: string; balance: number }> = [];
    allMembers.forEach((m: any) => {
      const uId = m._id.toString();
      const paid = paidPerUser[uId] || 0;
      balances.push({
        userId: uId,
        name: m.name || m.email.split("@")[0],
        balance: paid - share,
      });
    });

    // Debt simplification algorithm (Greedy match matchmaker)
    const debtors = balances.filter((b) => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
    const creditors = balances.filter((b) => b.balance > 0.01).sort((a, b) => b.balance - a.balance);

    const settlements: Array<{ fromId: string; fromName: string; toId: string; toName: string; amount: number }> = [];

    let dIdx = 0;
    let cIdx = 0;

    while (dIdx < debtors.length && cIdx < creditors.length) {
      const debtor = debtors[dIdx];
      const creditor = creditors[cIdx];

      const debtAmount = -debtor.balance;
      const creditAmount = creditor.balance;
      const settledAmount = Math.min(debtAmount, creditAmount);

      settlements.push({
        fromId: debtor.userId,
        fromName: debtor.name,
        toId: creditor.userId,
        toName: creditor.name,
        amount: parseFloat(settledAmount.toFixed(2)),
      });

      debtor.balance += settledAmount;
      creditor.balance -= settledAmount;

      if (Math.abs(debtor.balance) < 0.01) dIdx++;
      if (Math.abs(creditor.balance) < 0.01) cIdx++;
    }

    const contributions = allMembers.map((m: any) => {
      const uId = m._id.toString();
      return {
        userId: uId,
        name: m.name || m.email.split("@")[0],
        image: m.image,
        totalPaid: parseFloat((paidPerUser[uId] || 0).toFixed(2)),
        balance: parseFloat(((paidPerUser[uId] || 0) - share).toFixed(2)),
      };
    });

    return c.json({
      success: true,
      data: {
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        sharePerMember: parseFloat(share.toFixed(2)),
        budgetRemaining: parseFloat(budgetRemaining.toFixed(2)),
        contributions,
        settlements,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default expensesSocialRouter;
