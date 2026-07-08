import mongoose, { Schema, Document } from "mongoose";

// User Schema
export interface IUser extends Document {
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    emailVerified: { type: Boolean, default: false },
    image: { type: String },
  },
  {
    timestamps: true,
    collection: "user", // Match Better Auth singular collection name
  }
);

export const UserModel = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

// Session Schema
export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
  },
  {
    timestamps: true,
    collection: "session",
  }
);

export const SessionModel = mongoose.models.Session || mongoose.model<ISession>("Session", SessionSchema);

// Account Schema
export interface IAccount extends Document {
  userId: mongoose.Types.ObjectId;
  providerId: string;
  accountId: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AccountSchema = new Schema<IAccount>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    providerId: { type: String, required: true }, // e.g. "email", "google"
    accountId: { type: String, required: true }, // e.g. user ID in provider
    password: { type: String }, // Hashed password for email provider
  },
  {
    timestamps: true,
    collection: "account",
  }
);

export const AccountModel = mongoose.models.Account || mongoose.model<IAccount>("Account", AccountSchema);

// Verification Token Schema
export interface IVerification extends Document {
  identifier: string;
  value: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationSchema = new Schema<IVerification>(
  {
    identifier: { type: String, required: true },
    value: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  {
    timestamps: true,
    collection: "verification",
  }
);

export const VerificationModel = mongoose.models.Verification || mongoose.model<IVerification>("Verification", VerificationSchema);
