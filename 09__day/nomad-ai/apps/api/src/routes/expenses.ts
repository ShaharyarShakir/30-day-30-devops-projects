import { Hono } from "hono";
import { authMiddleware, type AuthContextVariables } from "../auth/middleware.js";
import { AddExpenseSchema } from "../validators/core.js";
import { ExpenseService } from "../services/expense.js";

const expensesRouter = new Hono<{ Variables: AuthContextVariables }>();

expensesRouter.use("*", authMiddleware);

// POST / - Add Expense
expensesRouter.post("/", async (c) => {
  const user = c.get("user");
  try {
    const { tripId, ...expenseDetails } = await c.req.json();
    if (!tripId) {
      throw new Error("tripId is required.");
    }
    const validated = AddExpenseSchema.parse(expenseDetails);
    const expense = await ExpenseService.createExpense(user.id, tripId, validated);
    
    return c.json({
      success: true,
      data: expense,
      message: "Expense added successfully",
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.errors ? error.errors.map((e: any) => e.message).join(", ") : error.message,
        },
      },
      400
    );
  }
});

// GET / - List Expenses
expensesRouter.get("/", async (c) => {
  const user = c.get("user");
  const tripId = c.req.query("tripId");
  const category = c.req.query("category");
  const page = parseInt(c.req.query("page") || "1", 10);
  const limit = parseInt(c.req.query("limit") || "10", 10);

  try {
    if (!tripId) {
      throw new Error("tripId query parameter is required.");
    }
    const result = await ExpenseService.getExpenses(user.id, tripId, { category, page, limit });
    return c.json({
      success: true,
      data: result,
      message: "Expenses retrieved successfully",
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: {
          code: "FETCH_ERROR",
          message: error.message,
        },
      },
      400
    );
  }
});

// GET /summary - Budget summary grouping
expensesRouter.get("/summary", async (c) => {
  const user = c.get("user");
  const tripId = c.req.query("tripId");

  try {
    if (!tripId) {
      throw new Error("tripId query parameter is required.");
    }
    const summary = await ExpenseService.getBudgetSummary(user.id, tripId);
    return c.json({
      success: true,
      data: summary,
      message: "Budget summary retrieved successfully",
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: {
          code: "SUMMARY_ERROR",
          message: error.message,
        },
      },
      400
    );
  }
});

// PATCH /:id - Update Expense
expensesRouter.patch("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  try {
    const body = await c.req.json();
    const validated = AddExpenseSchema.partial().parse(body);

    const expense = await ExpenseService.updateExpense(user.id, id, validated);
    return c.json({
      success: true,
      data: expense,
      message: "Expense updated successfully",
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: {
          code: "UPDATE_ERROR",
          message: error.message,
        },
      },
      400
    );
  }
});

// DELETE /:id - Delete Expense
expensesRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = c.req.param("id");
  try {
    await ExpenseService.deleteExpense(user.id, id);
    return c.json({
      success: true,
      data: {},
      message: "Expense deleted successfully",
    });
  } catch (error: any) {
    return c.json(
      {
        success: false,
        error: {
          code: "DELETE_ERROR",
          message: error.message,
        },
      },
      400
    );
  }
});

export default expensesRouter;
