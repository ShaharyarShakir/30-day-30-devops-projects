import { z } from "zod";

export const RegisterInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  name: z.string().min(2, "Name must be at least 2 characters long"),
});

export const LoginInputSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const ForgotPasswordInputSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const ResetPasswordInputSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
});
