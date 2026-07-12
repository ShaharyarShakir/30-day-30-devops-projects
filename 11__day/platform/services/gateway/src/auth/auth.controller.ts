import { Controller, Post, Get, Req, Res, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FastifyRequest, FastifyReply } from "fastify";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  private authUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.authUrl = this.configService.get<string>("AUTH_URL");
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login and establish session cookie" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        email: { type: "string", format: "email", example: "dev@platform.local" },
        password: { type: "string", example: "password123" }
      },
      required: ["email", "password"]
    }
  })
  @ApiResponse({ status: 200, description: "Successfully authenticated" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async login(@Body() body: any, @Req() req: FastifyRequest, @Res() res: FastifyReply) {
    try {
      const response = await fetch(`${this.authUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": (req.headers["x-request-id"] as string) || (req.id as string)
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).send(data);
      }

      const token = data.token || data.accessToken || data.jwt;
      if (!token) {
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
          message: "Auth service response missing access token"
        });
      }

      // Store JWT in HTTP-Only Cookie
      res.setCookie("token", token, {
        httpOnly: true,
        secure: this.configService.get<string>("NODE_ENV") === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      return res.status(HttpStatus.OK).send(data);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        message: "Failed to communicate with Auth service",
        error: error.message
      });
    }
  }

  @Post("register")
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({ status: 201, description: "Successfully registered" })
  async register(@Body() body: any, @Req() req: FastifyRequest, @Res() res: FastifyReply) {
    try {
      const response = await fetch(`${this.authUrl}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Request-ID": (req.headers["x-request-id"] as string) || (req.id as string)
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      return res.status(response.status).send(data);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        message: "Failed to communicate with Auth service",
        error: error.message
      });
    }
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Logout and clear session cookie" })
  @ApiResponse({ status: 200, description: "Successfully logged out" })
  async logout(@Res() res: FastifyReply) {
    res.clearCookie("token", {
      path: "/"
    });
    return res.status(HttpStatus.OK).send({ message: "Successfully logged out" });
  }

  @Get("me")
  @ApiOperation({ summary: "Get currently authenticated user details" })
  @ApiResponse({ status: 200, description: "User profile details" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async me(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const token = req.cookies.token || req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(HttpStatus.UNAUTHORIZED).send({ message: "Unauthorized" });
    }

    try {
      const response = await fetch(`${this.authUrl}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Request-ID": (req.headers["x-request-id"] as string) || (req.id as string)
        }
      });

      const data = await response.json();
      return res.status(response.status).send(data);
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        message: "Failed to communicate with Auth service",
        error: error.message
      });
    }
  }
}
