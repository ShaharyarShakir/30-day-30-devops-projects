export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Trip {
  id: string;
  title: string;
  description?: string;
  country: string;
  city?: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  coverImage?: string;
  owner: string; // userId
  members: string[]; // array of userIds
  status: "planning" | "active" | "completed";
  visibility: "private" | "public";
  createdAt: string;
  updatedAt: string;
}

export interface Destination {
  id: string;
  tripId: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  notes?: string;
  arrivalDate: string;
  departureDate: string;
  order: number;
}

export interface Expense {
  id: string;
  tripId: string;
  userId: string;
  category: "Food" | "Hotel" | "Flight" | "Shopping" | "Transport" | "Entertainment" | "Other";
  amount: number;
  currency: string;
  description?: string;
  location?: string;
  receiptImage?: string;
  createdAt: string;
}

export interface Journal {
  id: string;
  tripId: string;
  userId: string;
  title: string;
  content: string;
  photos?: string[];
  videos?: string[];
  voiceNotes?: string[];
  location?: string;
  weather?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: "system" | "trip_update" | "expense_added" | "member_joined" | "journal_added";
  read: boolean;
  createdAt: string;
}

export interface AIChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface AIChat {
  id: string;
  userId: string;
  tripId?: string;
  messages: AIChatMessage[];
  model: string;
  createdAt: string;
}

