import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Better Auth requires a database client. We can retrieve it from Mongoose after connection is established.
const getDbClient = () => {
  const client = mongoose.connection.getClient();
  return client.db();
};

export const auth = betterAuth({
  database: mongodbAdapter(getDbClient()),
  secret: process.env.BETTER_AUTH_SECRET || "default_auth_secret_minimum_32_characters_long",
  emailAndPassword: {
    enabled: true,
    autoSignIn: false, // We'll manage signing in explicitly
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "google_dummy_client_id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "google_dummy_client_secret",
    },
  },
});
