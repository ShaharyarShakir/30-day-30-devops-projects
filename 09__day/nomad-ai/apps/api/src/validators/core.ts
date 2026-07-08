import { z } from "zod";

export const CreateTripSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  city: z.string().optional(),
  startDate: z.string().datetime("Start date must be a valid ISO datetime"),
  endDate: z.string().datetime("End date must be a valid ISO datetime"),
  budget: z.number().nonnegative("Budget must be 0 or greater"),
  currency: z.string().default("USD"),
  coverImage: z.string().optional(),
  visibility: z.enum(["private", "public"]).default("private"),
});

export const UpdateTripSchema = CreateTripSchema.partial().extend({
  status: z.enum(["planning", "active", "completed"]).optional(),
});

export const AddDestinationSchema = z.object({
  name: z.string().min(1, "Destination name is required"),
  latitude: z.number(),
  longitude: z.number(),
  address: z.string().optional(),
  notes: z.string().optional(),
  arrivalDate: z.string().datetime("Arrival date must be a valid ISO datetime"),
  departureDate: z.string().datetime("Departure date must be a valid ISO datetime"),
  order: z.number().int().nonnegative(),
});

export const AddExpenseSchema = z.object({
  category: z.enum(["Food", "Hotel", "Flight", "Shopping", "Transport", "Entertainment", "Other"]),
  amount: z.number().positive("Amount must be greater than 0"),
  currency: z.string().min(1, "Currency is required"),
  description: z.string().optional(),
  location: z.string().optional(),
  receiptImage: z.string().optional(),
});

export const CreateJournalSchema = z.object({
  title: z.string().min(1, "Journal title is required"),
  content: z.string().min(1, "Journal content is required"),
  photos: z.array(z.string()).optional(),
  videos: z.array(z.string()).optional(),
  voiceNotes: z.array(z.string()).optional(),
  location: z.string().optional(),
  weather: z.string().optional(),
});
