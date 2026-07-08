import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { AuthService } from "./service.js";
import {
  RegisterInputSchema,
  LoginInputSchema,
  ForgotPasswordInputSchema,
  ResetPasswordInputSchema,
} from "./validators.js";
import { authMiddleware, type AuthContextVariables } from "./middleware.js";

// We define Hono app with custom context variables (user payload)
const authRouter = new Hono<{ Variables: AuthContextVariables }>();

// 1. Register endpoint
authRouter.post("/register", zValidator("json", RegisterInputSchema), async (c) => {
  const { name, email, password } = c.req.valid("json");
  try {
    const result = await AuthService.register(name, email, password);
    return c.json(result, 201);
  } catch (error: any) {
    return c.json({ error: error.message || "Registration failed." }, 400);
  }
});

// 2. Login endpoint
authRouter.post("/login", zValidator("json", LoginInputSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  try {
    const result = await AuthService.login(email, password);
    return c.json(result, 200);
  } catch (error: any) {
    return c.json({ error: error.message || "Invalid credentials." }, 401);
  }
});

// 3. Logout endpoint
authRouter.post("/logout", async (c) => {
  const { refreshToken } = await c.req.json().catch(() => ({}));
  if (!refreshToken) {
    return c.json({ error: "Refresh token is required to log out." }, 400);
  }
  try {
    await AuthService.logout(refreshToken);
    return c.json({ success: true }, 200);
  } catch (error: any) {
    return c.json({ error: error.message || "Logout failed." }, 400);
  }
});

// 4. Refresh token endpoint
authRouter.post("/refresh", async (c) => {
  const { refreshToken } = await c.req.json().catch(() => ({}));
  if (!refreshToken) {
    return c.json({ error: "Refresh token is required." }, 400);
  }
  try {
    const tokens = await AuthService.refresh(refreshToken);
    return c.json(tokens, 200);
  } catch (error: any) {
    return c.json({ error: error.message || "Session refresh failed." }, 401);
  }
});

// 5. Get current user profile (protected route)
authRouter.get("/me", authMiddleware, async (c) => {
  const userPayload = c.get("user");
  try {
    const userProfile = await AuthService.getMe(userPayload.userId);
    return c.json(userProfile, 200);
  } catch (error: any) {
    return c.json({ error: error.message || "User not found." }, 404);
  }
});

// 6. Get session details (alias for /me for Better Auth parity)
authRouter.get("/session", authMiddleware, async (c) => {
  const userPayload = c.get("user");
  try {
    const userProfile = await AuthService.getMe(userPayload.userId);
    return c.json({ session: { userId: userPayload.userId }, user: userProfile }, 200);
  } catch (error: any) {
    return c.json({ error: error.message || "Session invalid." }, 401);
  }
});

// 7. Forgot password endpoint
authRouter.post("/forgot-password", zValidator("json", ForgotPasswordInputSchema), async (c) => {
  const { email } = c.req.valid("json");
  try {
    const result = await AuthService.forgotPassword(email);
    return c.json(result, 200);
  } catch (error: any) {
    return c.json({ error: error.message || "Request failed." }, 400);
  }
});

// 8. Reset password endpoint
authRouter.post("/reset-password", zValidator("json", ResetPasswordInputSchema), async (c) => {
  const { token, newPassword } = c.req.valid("json");
  try {
    const result = await AuthService.resetPassword(token, newPassword);
    return c.json(result, 200);
  } catch (error: any) {
    return c.json({ error: error.message || "Password reset failed." }, 400);
  }
});

export default authRouter;
