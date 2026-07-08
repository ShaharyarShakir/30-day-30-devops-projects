import { createMiddleware } from "hono/factory";
import { verifyAccessToken, type TokenPayload } from "./session.js";

export interface AuthContextVariables {
  user: TokenPayload;
}

export const authMiddleware = createMiddleware<{ Variables: AuthContextVariables }>(async (c, next) => {
  const authHeader = c.req.header("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json({ error: "Access token is missing or malformed." }, 401);
  }

  const token = authHeader.split(" ")[1];
  const payload = verifyAccessToken(token);
  if (!payload) {
    return c.json({ error: "Access token is invalid or has expired." }, 401);
  }

  c.set("user", payload);
  await next();
});
