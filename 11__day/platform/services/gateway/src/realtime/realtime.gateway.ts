import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { verifyJwt } from "../auth/jwt.utils";
import { PresenceService } from "./presence.service";
import { LimiterService } from "./limiter.service";
import { KafkaService } from "./kafka.service";
import { MetricsService } from "./metrics.service";

@WebSocketGateway(4001, {
  cors: {
    origin: "*",
  },
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeGateway.name);
  private readonly jwtSecret: string;
  private readonly kafkaTopic = "platform.realtime-events";
  private readonly chatTopic = "platform.chat-messages";
  private readonly MAX_MESSAGE_SIZE = 10000; // 10KB
  private readonly MAX_ROOMS_PER_CLIENT = 50;
  private readonly IDLE_TIMEOUT = 300000; // 5 minutes
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private heartbeatInterval: NodeJS.Timeout;

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly configService: ConfigService,
    private readonly presenceService: PresenceService,
    private readonly limiterService: LimiterService,
    private readonly kafkaService: KafkaService,
    private readonly metricsService: MetricsService
  ) {
    this.jwtSecret =
      this.configService.get<string>("JWT_SECRET") ||
      "super_secret_platform_dev_jwt_key_that_is_at_least_256_bits_long_for_security_standards";
    
    // Start idle connection checker
    this.startIdleConnectionChecker();
  }

  private startIdleConnectionChecker(): void {
    this.heartbeatInterval = setInterval(() => {
      this.checkIdleConnections();
    }, this.HEARTBEAT_INTERVAL);
    
    this.logger.log(`Idle connection checker started with ${this.HEARTBEAT_INTERVAL}ms interval`);
  }

  private checkIdleConnections(): void {
    const now = Date.now();
    const sockets = this.server.sockets.sockets;
    
    sockets.forEach((socket: Socket) => {
      const connectedAt = socket.data.connectedAt;
      if (!connectedAt) return;

      const idleTime = now - connectedAt;
      
      // If connection has been idle longer than timeout, disconnect
      if (idleTime > this.IDLE_TIMEOUT) {
        this.logger.warn(`Disconnecting idle socket ${socket.id} (idle for ${idleTime}ms)`);
        socket.disconnect(true);
      }
    });
  }

  private extractToken(client: Socket): string | null {
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }
    const cookieHeader = client.handshake.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/token=([^;]+)/);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Connection rejected: Missing token from client ${client.id}`);
        client.disconnect(true);
        return;
      }

      const payload = verifyJwt(token, this.jwtSecret);
      client.data.userId = payload.sub;
      client.data.roles = payload.roles || [];
      client.data.email = payload.email || "";
      client.data.joinedRooms = new Set<string>();
      client.data.connectedAt = Date.now();

      // Register device
      const deviceInfo = {
        socketId: client.id,
        deviceType: this.extractDeviceType(client),
        userAgent: client.handshake.headers["user-agent"] || "unknown",
        connectedAt: Date.now(),
      };
      
      const deviceRegistration = await this.presenceService.registerDevice(
        payload.sub,
        client.id,
        deviceInfo
      );

      if (!deviceRegistration.allowed) {
        this.logger.warn(`Connection rejected: ${deviceRegistration.message}`);
        client.emit("error", { message: deviceRegistration.message });
        client.disconnect(true);
        return;
      }

      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);

      // Track connection metrics
      this.metricsService.incrementConnectedClients();

      // Set user presence online in Redis
      await this.presenceService.setUserPresence(payload.sub, "ONLINE", 60);

      // Emit user.online to Kafka
      await this.kafkaService.emitEvent(this.kafkaTopic, payload.sub, {
        eventType: "user.online",
        userId: payload.sub,
        email: payload.email,
        roles: payload.roles,
      });

      // Acknowledge connection
      client.emit("connected", { userId: payload.sub });
    } catch (err) {
      this.logger.warn(`Connection rejected: Invalid token. Error: ${err.message}`);
      client.disconnect(true);
    }
  }

  private extractDeviceType(client: Socket): string {
    const userAgent = client.handshake.headers["user-agent"] || "";
    if (userAgent.includes("Mobile")) return "mobile";
    if (userAgent.includes("Tablet")) return "tablet";
    if (userAgent.includes("Chrome") || userAgent.includes("Firefox") || userAgent.includes("Safari")) {
      return "desktop";
    }
    return "unknown";
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);

    // Track disconnection metrics
    this.metricsService.decrementConnectedClients();

    // Unregister device
    await this.presenceService.unregisterDevice(userId, client.id);

    // Set presence offline
    await this.presenceService.setUserPresence(userId, "OFFLINE");

    // Clean up room memberships in presence service
    const joinedRooms = client.data.joinedRooms as Set<string>;
    if (joinedRooms) {
      for (const room of joinedRooms) {
        await this.presenceService.leaveRoomPresence(room, userId);
        client.to(room).emit("left", { userId });
      }
    }

    // Emit user.offline to Kafka
    await this.kafkaService.emitEvent(this.kafkaTopic, userId, {
      eventType: "user.offline",
      userId,
    });
  }

  @SubscribeMessage("heartbeat")
  async handleHeartbeat(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    if (!userId) return;

    // Refresh TTL in Redis
    await this.presenceService.setUserPresence(userId, "ONLINE", 60);

    // Update device heartbeat
    await this.presenceService.updateDeviceHeartbeat(client.id);

    // Return pong
    client.emit("heartbeat", { status: "pong" });
  }

  @SubscribeMessage("join_room")
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; sessionToken?: string }
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const { room, sessionToken } = data;
    if (!room) {
      client.emit("error", { message: "Room ID is required" });
      return;
    }

    // Check maximum room count
    const joinedRooms = client.data.joinedRooms as Set<string>;
    if (joinedRooms.size >= this.MAX_ROOMS_PER_CLIENT) {
      this.logger.warn(`User ${userId} exceeded max room limit (${this.MAX_ROOMS_PER_CLIENT})`);
      client.emit("error", { message: `Maximum ${this.MAX_ROOMS_PER_CLIENT} rooms allowed per connection` });
      return;
    }

    // Room pattern check: e.g. session:uuid, course:uuid, chat:uuid
    const parts = room.split(":");
    if (parts.length !== 2) {
      client.emit("error", { message: "Invalid room format. Must be format type:id" });
      return;
    }

    const [roomType, roomId] = parts;

    // Security check: If joining a live session room, check token authorization
    if (roomType === "session") {
      if (!sessionToken) {
        this.logger.warn(`User ${userId} rejected joining session room: Missing sessionToken`);
        client.emit("error", { message: "Session token is required to join this room" });
        return;
      }

      try {
        const claims = verifyJwt(sessionToken, this.jwtSecret);
        if (claims.session_id !== roomId || claims.sub !== userId) {
          this.logger.warn(
            `User ${userId} rejected joining session room: Claim mismatch (Claims session: ${claims.session_id}, Client user: ${claims.sub})`
          );
          client.emit("error", { message: "Unauthorized: session token does not match the room" });
          return;
        }
      } catch (err) {
        this.logger.warn(`User ${userId} rejected joining session room: Token verification failed: ${err.message}`);
        client.emit("error", { message: "Unauthorized: Invalid session token" });
        return;
      }
    }

    // Join room
    client.join(room);
    joinedRooms.add(room);

    // Update presence list in room
    await this.presenceService.joinRoomPresence(room, userId);

    // Notify room
    client.emit("joined", { room });
    client.to(room).emit("joined", { userId });

    // Emit event to Kafka
    await this.kafkaService.emitEvent(this.kafkaTopic, room, {
      eventType: "user.joined",
      userId,
      room,
    });
  }

  @SubscribeMessage("leave_room")
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string }
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const { room } = data;
    if (!room) return;

    client.leave(room);
    (client.data.joinedRooms as Set<string>).delete(room);

    // Update presence
    await this.presenceService.leaveRoomPresence(room, userId);

    // Notify room
    client.emit("left", { room });
    client.to(room).emit("left", { userId });

    // Emit event to Kafka
    await this.kafkaService.emitEvent(this.kafkaTopic, room, {
      eventType: "user.left",
      userId,
      room,
    });
  }

  @SubscribeMessage("send_message")
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; content: string }
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const { room, content } = data;

    // Rate Limit: 30 messages per minute (0.5 tokens/sec)
    if (await this.limiterService.isRateLimited(userId, "send_message", 30, 0.5)) {
      client.emit("error", { message: "Rate limit exceeded: Max 30 messages per minute" });
      return;
    }

    if (!room || !content) {
      client.emit("error", { message: "Room and content are required" });
      return;
    }

    // Message size validation
    if (content.length > this.MAX_MESSAGE_SIZE) {
      client.emit("error", { message: `Message too large. Maximum ${this.MAX_MESSAGE_SIZE} characters allowed` });
      return;
    }

    const payload = {
      room,
      userId,
      email: client.data.email,
      content,
      createdAt: new Date().toISOString(),
    };

    // Track message metrics
    this.metricsService.incrementMessageCount();

    // Forward to Kafka for processing & persistence
    await this.kafkaService.emitEvent(this.chatTopic, room, payload);

    // Directly broadcast message to the room to display instantly in client UI in Phase 2
    this.server.to(room).emit("message", payload);
  }

  @SubscribeMessage("typing")
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; isTyping: boolean }
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const { room, isTyping } = data;
    if (!room) return;

    // Rate Limit: 5 per second
    if (await this.limiterService.isRateLimited(userId, "typing", 5, 5)) {
      return;
    }

    // Track event metrics
    this.metricsService.incrementEventCount();

    client.to(room).emit("typing", { userId, isTyping });
  }

  @SubscribeMessage("reaction")
  async handleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; emoji: string }
  ) {
    const userId = client.data.userId;
    if (!userId) return;

    const { room, emoji } = data;
    if (!room || !emoji) return;

    // Rate Limit: 300 per minute (5 tokens/sec)
    if (await this.limiterService.isRateLimited(userId, "reaction", 300, 5)) {
      return;
    }

    // Track event metrics
    this.metricsService.incrementEventCount();

    this.server.to(room).emit("reaction", { userId, emoji });
  }

  onModuleDestroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.logger.log("Idle connection checker stopped");
    }
  }
}
