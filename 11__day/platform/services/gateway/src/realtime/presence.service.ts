import { Injectable, Inject, Logger } from "@nestjs/common";
import Redis from "ioredis";

interface DeviceInfo {
  socketId: string;
  deviceType: string;
  userAgent: string;
  connectedAt: number;
  lastHeartbeat: number;
}

interface ConnectionRegistry {
  userId: string;
  devices: Map<string, DeviceInfo>;
}

@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private readonly MAX_DEVICES_PER_USER = 5;

  constructor(@Inject("REDIS_CLIENT") private readonly redis: Redis) {}

  private userKey(userId: string): string {
    return `presence:user:${userId}`;
  }

  private sessionKey(sessionId: string): string {
    return `presence:session:${sessionId}`;
  }

  private roomKey(roomId: string): string {
    return `presence:room:${roomId}`;
  }

  private userDevicesKey(userId: string): string {
    return `presence:devices:${userId}`;
  }

  private connectionRegistryKey(userId: string): string {
    return `presence:registry:${userId}`;
  }

  /**
   * Sets user presence state with TTL.
   */
  async setUserPresence(
    userId: string,
    state: "ONLINE" | "AWAY" | "OFFLINE",
    ttlSeconds = 60
  ): Promise<void> {
    const key = this.userKey(userId);
    if (state === "OFFLINE") {
      await this.redis.del(key);
      this.logger.debug(`User ${userId} set to OFFLINE`);
    } else {
      await this.redis.set(key, state, "EX", ttlSeconds);
      this.logger.debug(`User ${userId} set to ${state} with TTL ${ttlSeconds}s`);
    }
  }

  /**
   * Gets current user presence state.
   */
  async getUserPresence(userId: string): Promise<string> {
    return (await this.redis.get(this.userKey(userId))) || "OFFLINE";
  }

  /**
   * Sets session presence with metadata.
   */
  async setSessionPresence(
    sessionId: string,
    userId: string,
    metadata: { deviceType?: string; userAgent?: string } = {},
    ttlSeconds = 60
  ): Promise<void> {
    const key = this.sessionKey(sessionId);
    const data = {
      userId,
      deviceType: metadata.deviceType || "unknown",
      userAgent: metadata.userAgent || "unknown",
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
    };
    await this.redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
    this.logger.debug(`Session ${sessionId} presence set for user ${userId}`);
  }

  /**
   * Gets session presence data.
   */
  async getSessionPresence(sessionId: string): Promise<DeviceInfo | null> {
    const key = this.sessionKey(sessionId);
    const data = await this.redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as DeviceInfo;
  }

  /**
   * Registers a device connection for a user.
   * Enforces maximum device limit.
   */
  async registerDevice(
    userId: string,
    socketId: string,
    deviceInfo: Partial<DeviceInfo>
  ): Promise<{ allowed: boolean; message?: string }> {
    const devicesKey = this.userDevicesKey(userId);
    const deviceCount = await this.redis.scard(devicesKey);

    if (deviceCount >= this.MAX_DEVICES_PER_USER) {
      this.logger.warn(`User ${userId} exceeded max device limit (${this.MAX_DEVICES_PER_USER})`);
      return {
        allowed: false,
        message: `Maximum ${this.MAX_DEVICES_PER_USER} devices allowed per user`,
      };
    }

    await this.redis.sadd(devicesKey, socketId);
    await this.redis.expire(devicesKey, 3600); // 1 hour TTL

    // Store device metadata
    const deviceDataKey = `presence:device:${socketId}`;
    const fullDeviceInfo: DeviceInfo = {
      socketId,
      deviceType: deviceInfo.deviceType || "unknown",
      userAgent: deviceInfo.userAgent || "unknown",
      connectedAt: deviceInfo.connectedAt || Date.now(),
      lastHeartbeat: deviceInfo.lastHeartbeat || Date.now(),
    };
    await this.redis.set(deviceDataKey, JSON.stringify(fullDeviceInfo), "EX", 3600);

    this.logger.debug(`Device ${socketId} registered for user ${userId}`);
    return { allowed: true };
  }

  /**
   * Unregisters a device connection.
   */
  async unregisterDevice(userId: string, socketId: string): Promise<void> {
    const devicesKey = this.userDevicesKey(userId);
    await this.redis.srem(devicesKey, socketId);

    const deviceDataKey = `presence:device:${socketId}`;
    await this.redis.del(deviceDataKey);

    this.logger.debug(`Device ${socketId} unregistered for user ${userId}`);
  }

  /**
   * Gets all devices for a user.
   */
  async getUserDevices(userId: string): Promise<string[]> {
    const devicesKey = this.userDevicesKey(userId);
    return this.redis.smembers(devicesKey);
  }

  /**
   * Gets device count for a user.
   */
  async getUserDeviceCount(userId: string): Promise<number> {
    const devicesKey = this.userDevicesKey(userId);
    return this.redis.scard(devicesKey);
  }

  /**
   * Updates device heartbeat timestamp.
   */
  async updateDeviceHeartbeat(socketId: string): Promise<void> {
    const deviceDataKey = `presence:device:${socketId}`;
    const data = await this.redis.get(deviceDataKey);
    if (data) {
      const deviceInfo = JSON.parse(data) as DeviceInfo;
      deviceInfo.lastHeartbeat = Date.now();
      await this.redis.set(deviceDataKey, JSON.stringify(deviceInfo), "EX", 3600);
    }
  }

  /**
   * Adds user to room presence.
   */
  async joinRoomPresence(roomId: string, userId: string): Promise<void> {
    const key = this.roomKey(roomId);
    await this.redis.sadd(key, userId);
    await this.redis.expire(key, 3600); // 1 hour TTL
    this.logger.debug(`User ${userId} joined room ${roomId}`);
  }

  /**
   * Removes user from room presence.
   */
  async leaveRoomPresence(roomId: string, userId: string): Promise<void> {
    const key = this.roomKey(roomId);
    await this.redis.srem(key, userId);
    this.logger.debug(`User ${userId} left room ${roomId}`);
  }

  /**
   * Gets all users in a room.
   */
  async getRoomPresence(roomId: string): Promise<string[]> {
    const key = this.roomKey(roomId);
    return this.redis.smembers(key);
  }

  /**
   * Gets user count in a room.
   */
  async getRoomUserCount(roomId: string): Promise<number> {
    const key = this.roomKey(roomId);
    return this.redis.scard(key);
  }

  /**
   * Clears all users from a room.
   */
  async clearRoomPresence(roomId: string): Promise<void> {
    const key = this.roomKey(roomId);
    await this.redis.del(key);
    this.logger.debug(`Room ${roomId} presence cleared`);
  }

  /**
   * Gets presence statistics for a user.
   */
  async getUserStats(userId: string): Promise<{
    presence: string;
    deviceCount: number;
    devices: string[];
  }> {
    const [presence, deviceCount, devices] = await Promise.all([
      this.getUserPresence(userId),
      this.getUserDeviceCount(userId),
      this.getUserDevices(userId),
    ]);

    return {
      presence,
      deviceCount,
      devices,
    };
  }

  /**
   * Gets presence statistics for a room.
   */
  async getRoomStats(roomId: string): Promise<{
    userCount: number;
    users: string[];
  }> {
    const [userCount, users] = await Promise.all([
      this.getRoomUserCount(roomId),
      this.getRoomPresence(roomId),
    ]);

    return {
      userCount,
      users,
    };
  }

  /**
   * Cleans up stale presence data for a user.
   */
  async cleanupUserPresence(userId: string): Promise<void> {
    await this.redis.del(this.userKey(userId));
    await this.redis.del(this.userDevicesKey(userId));
    await this.redis.del(this.connectionRegistryKey(userId));
    this.logger.debug(`Cleaned up presence data for user ${userId}`);
  }
}
