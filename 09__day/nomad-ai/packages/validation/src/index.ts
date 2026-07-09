import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  name: z.string().min(2, "Name must be at least 2 characters long").optional(),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const TripSchema = z.object({
  destination: z.string().min(1, "Destination is required"),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  budget: z.number().nonnegative(),
  activities: z.array(z.string()),
});
