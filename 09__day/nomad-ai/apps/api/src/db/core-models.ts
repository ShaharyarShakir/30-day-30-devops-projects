import mongoose, { Schema, Document } from "mongoose";

// Trip Document Interface
export interface ITrip extends Document {
  title: string;
  description?: string;
  country: string;
  city?: string;
  startDate: Date;
  endDate: Date;
  budget: number;
  currency: string;
  coverImage?: string;
  owner: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  status: "planning" | "active" | "completed";
  visibility: "private" | "public";
  privacy?: {
    whoCanSee: "members" | "public";
    whoCanComment: "members" | "friends";
    whoCanDownloadMedia: "members" | "friends";
    whoCanInvite: "owner" | "members";
  };
  createdAt: Date;
  updatedAt: Date;
}

const TripSchema = new Schema<ITrip>(
  {
    title: { type: String, required: true },
    description: { type: String },
    country: { type: String, required: true },
    city: { type: String },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    budget: { type: Number, required: true },
    currency: { type: String, default: "USD" },
    coverImage: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
    status: { type: String, enum: ["planning", "active", "completed"], default: "planning" },
    visibility: { type: String, enum: ["private", "public"], default: "private" },
    privacy: {
      whoCanSee: { type: String, enum: ["members", "public"], default: "members" },
      whoCanComment: { type: String, enum: ["members", "friends"], default: "members" },
      whoCanDownloadMedia: { type: String, enum: ["members", "friends"], default: "members" },
      whoCanInvite: { type: String, enum: ["owner", "members"], default: "owner" },
    },
  },
  {
    timestamps: true,
    collection: "trip",
  }
);

export const TripModel = mongoose.models.Trip || mongoose.model<ITrip>("Trip", TripSchema);

// Destination Document Interface
export interface IDestination extends Document {
  tripId: mongoose.Types.ObjectId;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  notes?: string;
  arrivalDate: Date;
  departureDate: Date;
  order: number;
}

const DestinationSchema = new Schema<IDestination>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
    name: { type: String, required: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: { type: String },
    notes: { type: String },
    arrivalDate: { type: Date, required: true },
    departureDate: { type: Date, required: true },
    order: { type: Number, required: true },
  },
  {
    timestamps: true,
    collection: "destination",
  }
);

export const DestinationModel = mongoose.models.Destination || mongoose.model<IDestination>("Destination", DestinationSchema);

// Expense Document Interface
export interface IExpense extends Document {
  tripId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  category: "Food" | "Hotel" | "Flight" | "Shopping" | "Transport" | "Entertainment" | "Other";
  amount: number;
  currency: string;
  description?: string;
  location?: string;
  receiptImage?: string;
  createdAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: {
      type: String,
      enum: ["Food", "Hotel", "Flight", "Shopping", "Transport", "Entertainment", "Other"],
      required: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, default: "USD" },
    description: { type: String },
    location: { type: String },
    receiptImage: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "expense",
  }
);

export const ExpenseModel = mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);

// Journal Document Interface
export interface IJournal extends Document {
  tripId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  content: string;
  photos: string[];
  videos: string[];
  voiceNotes: string[];
  location?: string;
  weather?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JournalSchema = new Schema<IJournal>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    photos: [{ type: String }],
    videos: [{ type: String }],
    voiceNotes: [{ type: String }],
    location: { type: String },
    weather: { type: String },
  },
  {
    timestamps: true,
    collection: "journal",
  }
);

export const JournalModel = mongoose.models.Journal || mongoose.model<IJournal>("Journal", JournalSchema);

// Notification Document Interface
export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  type: "system" | "trip_update" | "expense_added" | "member_joined" | "journal_added";
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: ["system", "trip_update", "expense_added", "member_joined", "journal_added"],
      default: "system",
    },
    read: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "notification",
  }
);

export const NotificationModel = mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);

// AI Chat Document Interface
export interface IAIChat {
  userId: mongoose.Types.ObjectId;
  tripId?: mongoose.Types.ObjectId;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
  }>;
  model: string;
  createdAt: Date;
}

const AIChatSchema = new Schema<IAIChat>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tripId: { type: Schema.Types.ObjectId, ref: "Trip" },
    messages: [
      {
        role: { type: String, enum: ["user", "assistant", "system"], required: true },
        content: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    model: { type: String, default: "gpt-4o" },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "aichat",
  }
);

export const AIChatModel = mongoose.models.AIChat || mongoose.model<IAIChat>("AIChat", AIChatSchema);

// Message Document Interface
export interface IMessage extends Document {
  tripId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderName: string;
  senderImage?: string;
  content?: string;
  type: "text" | "photo" | "video" | "voice" | "location" | "file";
  mediaUrl?: string;
  metadata?: any;
  repliedTo?: mongoose.Types.ObjectId;
  reactions: Array<{ userId: mongoose.Types.ObjectId; emoji: string }>;
  readBy: Array<{ userId: mongoose.Types.ObjectId; readAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderName: { type: String, required: true },
    senderImage: { type: String },
    content: { type: String },
    type: {
      type: String,
      enum: ["text", "photo", "video", "voice", "location", "file"],
      required: true,
      default: "text",
    },
    mediaUrl: { type: String },
    metadata: { type: Schema.Types.Mixed },
    repliedTo: { type: Schema.Types.ObjectId, ref: "Message" },
    reactions: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        emoji: { type: String, required: true },
      },
    ],
    readBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
    collection: "message",
  }
);

export const MessageModel = mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);

// Media Document Interface
export interface IMedia extends Document {
  tripId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  url: string;
  thumbnailUrl?: string;
  type: "image" | "video" | "document";
  mimeType: string;
  fileName: string;
  sizeBytes: number;
  latitude?: number;
  longitude?: number;
  takenAt: Date;
  city?: string;
  country?: string;
  aiTags: string[];
  aiSummary?: string;
  createdAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userName: { type: String, required: true },
    url: { type: String, required: true },
    thumbnailUrl: { type: String },
    type: { type: String, enum: ["image", "video", "document"], required: true },
    mimeType: { type: String, required: true },
    fileName: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    latitude: { type: Number },
    longitude: { type: Number },
    takenAt: { type: Date, required: true, default: Date.now },
    city: { type: String },
    country: { type: String },
    aiTags: [{ type: String }],
    aiSummary: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "media",
  }
);

export const MediaModel = mongoose.models.Media || mongoose.model<IMedia>("Media", MediaSchema);

// Live Location Document Interface
export interface ILiveLocation extends Document {
  userId: mongoose.Types.ObjectId;
  tripId: mongoose.Types.ObjectId;
  latitude: number;
  longitude: number;
  expiresAt: Date;
  isActive: boolean;
  updatedAt: Date;
}

const LiveLocationSchema = new Schema<ILiveLocation>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    expiresAt: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
    collection: "livelocation",
  }
);

export const LiveLocationModel = mongoose.models.LiveLocation || mongoose.model<ILiveLocation>("LiveLocation", LiveLocationSchema);

// Vote Document Interface
export interface IVote extends Document {
  tripId: mongoose.Types.ObjectId;
  creatorId: mongoose.Types.ObjectId;
  title: string;
  options: Array<{
    text: string;
    votes: mongoose.Types.ObjectId[];
  }>;
  status: "open" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

const VoteSchema = new Schema<IVote>(
  {
    tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true, index: true },
    creatorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    options: [
      {
        text: { type: String, required: true },
        votes: [{ type: Schema.Types.ObjectId, ref: "User" }],
      },
    ],
    status: { type: String, enum: ["open", "closed"], default: "open" },
  },
  {
    timestamps: true,
    collection: "vote",
  }
);

export const VoteModel = mongoose.models.Vote || mongoose.model<IVote>("Vote", VoteSchema);

// User Device Token Document Interface
export interface IUserDeviceToken extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  platform: "ios" | "android" | "web";
  settings: {
    invitations: boolean;
    chat: boolean;
    uploads: boolean;
    arrivals: boolean;
    ai: boolean;
  };
  createdAt: Date;
}

const UserDeviceTokenSchema = new Schema<IUserDeviceToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ["ios", "android", "web"], required: true },
    settings: {
      invitations: { type: Boolean, default: true },
      chat: { type: Boolean, default: true },
      uploads: { type: Boolean, default: true },
      arrivals: { type: Boolean, default: true },
      ai: { type: Boolean, default: true },
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "userdevicetoken",
  }
);

export const UserDeviceTokenModel = mongoose.models.UserDeviceToken || mongoose.model<IUserDeviceToken>("UserDeviceToken", UserDeviceTokenSchema);

