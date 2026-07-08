import bcrypt from "bcrypt";
import { UserModel, AccountModel, SessionModel, VerificationModel } from "../db/models.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "./session.js";

export class AuthService {
  static async register(name: string, email: string, password: string) {
    // 1. Check if user already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      throw new Error("Email address is already registered.");
    }

    // 2. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. Create the user document
    const user = await UserModel.create({
      name,
      email,
      emailVerified: false,
    });

    // 4. Create the account document
    await AccountModel.create({
      userId: user._id,
      providerId: "email",
      accountId: user._id.toString(),
      password: hashedPassword,
    });

    // 5. Generate custom JWT tokens
    const accessToken = generateAccessToken({ id: user._id.toString(), userId: user._id.toString(), email });
    const refreshToken = generateRefreshToken({ id: user._id.toString(), userId: user._id.toString(), email });

    // 6. Save the refresh token to the Session collection
    await SessionModel.create({
      userId: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image,
      },
      accessToken,
      refreshToken,
    };
  }

  static async login(email: string, password: string) {
    // 1. Find user by email
    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new Error("Invalid email or password.");
    }

    // 2. Find matching credentials account
    const account = await AccountModel.findOne({
      userId: user._id,
      providerId: "email",
    });

    if (!account || !account.password) {
      throw new Error("No password account associated with this email.");
    }

    // 3. Verify password
    const passwordMatch = await bcrypt.compare(password, account.password);
    if (!passwordMatch) {
      throw new Error("Invalid email or password.");
    }

    // 4. Generate JWT tokens
    const accessToken = generateAccessToken({ id: user._id.toString(), userId: user._id.toString(), email: user.email });
    const refreshToken = generateRefreshToken({ id: user._id.toString(), userId: user._id.toString(), email: user.email });

    // 5. Store session in database (clean up old ones for this user if desired)
    await SessionModel.deleteMany({ userId: user._id }); // Single session per user for simplicity
    await SessionModel.create({
      userId: user._id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        image: user.image,
      },
      accessToken,
      refreshToken,
    };
  }

  static async logout(refreshToken: string) {
    await SessionModel.deleteOne({ token: refreshToken });
    return { success: true };
  }

  static async refresh(token: string) {
    // 1. Verify token
    const decoded = verifyRefreshToken(token);
    if (!decoded) {
      throw new Error("Invalid or expired refresh token.");
    }

    // 2. Check session in database
    const session = await SessionModel.findOne({ token });
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await SessionModel.deleteOne({ _id: session._id });
      }
      throw new Error("Refresh token session has expired or been revoked.");
    }

    // 3. Generate new tokens (rotation)
    const newAccessToken = generateAccessToken({ id: decoded.userId, userId: decoded.userId, email: decoded.email });
    const newRefreshToken = generateRefreshToken({ id: decoded.userId, userId: decoded.userId, email: decoded.email });

    // 4. Update session token in database
    session.token = newRefreshToken;
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await session.save();

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  static async getMe(userId: string) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error("User not found.");
    }
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image,
    };
  }

  static async forgotPassword(email: string) {
    const user = await UserModel.findOne({ email });
    if (!user) {
      // Return success anyway to prevent email enumeration
      return { success: true };
    }

    // Generate random reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Save token to verification tokens collection (expires in 1 hour)
    await VerificationModel.create({
      identifier: email,
      value: resetToken,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    console.log(`✉️ Mock email sent to ${email}. Reset Token: ${resetToken}`);
    return { success: true };
  }

  static async resetPassword(token: string, newPassword: string) {
    // 1. Verify token
    const verification = await VerificationModel.findOne({ value: token });
    if (!verification || verification.expiresAt < new Date()) {
      throw new Error("Invalid or expired reset token.");
    }

    // 2. Find user
    const user = await UserModel.findOne({ email: verification.identifier });
    if (!user) {
      throw new Error("User not found.");
    }

    // 3. Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await AccountModel.updateOne(
      { userId: user._id, providerId: "email" },
      { password: hashedPassword }
    );

    // 4. Clean up token
    await VerificationModel.deleteOne({ _id: verification._id });

    return { success: true };
  }
}
