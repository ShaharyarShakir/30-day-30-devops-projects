import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebSocketServer } from "ws";
import crypto from "crypto";

import { connectDatabase } from "./db/mongodb.js";
import authRouter from "./auth/routes.js";
import tripsRouter from "./routes/trips.js";
import destinationsRouter from "./routes/destinations.js";
import expensesRouter from "./routes/expenses.js";
import journalsRouter from "./routes/journals.js";
import notificationsRouter from "./routes/notifications.js";
import uploadsRouter from "./routes/uploads.js";
import aiRouter from "./routes/ai.js";
import messagesRouter from "./routes/messages.js";
import mediaRouter from "./routes/media.js";
import locationsRouter from "./routes/locations.js";
import votesRouter from "./routes/votes.js";
import timelineRouter from "./routes/timeline.js";
import expensesSocialRouter from "./routes/expenses-social.js";
import qrRouter from "./routes/qr.js";
import { websocketRouter } from "./websocket/server.js";
import { startWorker } from "./jobs/worker.js";

import { type AuthContextVariables } from "./auth/middleware.js";

const app = new Hono<{
  Variables: AuthContextVariables & {
    requestId: string;
  };
}>();

// Connect Database
connectDatabase();

// Start Background Queue Worker
startWorker();

// CORS Middleware
app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
    credentials: true,
  })
);

// Structured JSON Logging Middleware
app.use("*", async (c, next) => {
  const requestId = crypto.randomUUID();
  c.set("requestId", requestId);
  const start = Date.now();

  await next();

  const duration = Date.now() - start;
  const user = c.get("user") as any;
  const tripId = c.req.query("tripId") || c.req.param("tripId") || c.req.param("id");

  const logData = {
    request_id: requestId,
    user_id: user ? user.id : undefined,
    trip_id: tripId || undefined,
    ip: c.req.header("x-forwarded-for") || c.req.header("x-real-ip"),
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration_ms: duration,
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(logData));
});

// Serve Static Uploads
app.use("/uploads/*", serveStatic({ root: "./public" }));

// Register REST Routes
app.route("/auth", authRouter);
app.route("/trips", tripsRouter);
app.route("/destinations", destinationsRouter);
app.route("/expenses", expensesRouter);
app.route("/journals", journalsRouter);
app.route("/notifications", notificationsRouter);
app.route("/uploads", uploadsRouter);
app.route("/ai", aiRouter);
app.route("/messages", messagesRouter);
app.route("/media", mediaRouter);
app.route("/locations", locationsRouter);
app.route("/votes", votesRouter);
app.route("/timeline", timelineRouter);
app.route("/expenses-social", expensesSocialRouter);
app.route("/qr", qrRouter);

// Register WebSocket Route
app.route("/ws/trips", websocketRouter);

// Start Hono Node Server with WebSocket integration
const port = parseInt(process.env.PORT || "3000", 10);
const wss = new WebSocketServer({ noServer: true });

const server = serve(
  {
    fetch: app.fetch,
    port,
    websocket: {
      server: wss,
    },
  },
  (info) => {
    console.log(`[Server] Nomad AI API listening on http://localhost:${info.port}`);
  }
);
export default app;
