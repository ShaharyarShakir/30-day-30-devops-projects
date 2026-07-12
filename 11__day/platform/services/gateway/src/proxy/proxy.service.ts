import { Injectable, OnModuleInit } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import fastifyHttpProxy from "@fastify/http-proxy";
import { verifyJwt } from "../auth/jwt.utils";

@Injectable()
export class ProxyService implements OnModuleInit {
  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly configService: ConfigService
  ) {}

  onModuleInit() {
    const httpAdapter = this.adapterHost.httpAdapter;
    const fastify: FastifyInstance = httpAdapter.getInstance() as any;

    const jwtSecret = this.configService.get<string>("JWT_SECRET");
    const jwtPublicKey = this.configService.get<string>("JWT_PUBLIC_KEY");
    const keyOrSecret = jwtPublicKey || jwtSecret;

    // Define services to proxy
    const proxyConfigs = [
      {
        prefix: "/users",
        upstream: this.configService.get<string>("USER_URL"),
        protected: true
      },
      {
        prefix: "/courses",
        upstream: this.configService.get<string>("COURSE_URL"),
        protected: true
      },
      {
        prefix: "/media",
        upstream: this.configService.get<string>("MEDIA_URL"),
        protected: true
      },
      {
        prefix: "/chat",
        upstream: this.configService.get<string>("CHAT_URL"),
        protected: true
      },
      {
        prefix: "/sessions",
        upstream: this.configService.get<string>("LIVE_SESSION_URL"),
        protected: true
      },
      {
        prefix: "/coding",
        upstream: this.configService.get<string>("CODING_URL"),
        protected: true
      },
      {
        prefix: "/auth",
        upstream: this.configService.get<string>("AUTH_URL"),
        protected: false // login/register/logout/me are already handled by custom AuthController
      }
    ];

    proxyConfigs.forEach(({ prefix, upstream, protected: isProtected }) => {
      fastify.register(async (instance) => {
        instance.register(fastifyHttpProxy as any, {
          upstream,
          prefix,
          rewritePrefix: prefix,
          preValidation: async () => {}, // bypass duplicate content type parser registration
          preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
            // Propagate Request ID header to downstream service
            request.headers["x-request-id"] =
              (request.headers["x-request-id"] as string) || request.id;

            if (isProtected) {
              // Retrieve JWT from cookies or authorization header
              const token =
                request.cookies?.token || request.headers.authorization?.replace("Bearer ", "");

              if (!token) {
                reply.status(401).send({ message: "Unauthorized: Missing session token" });
                return; // blocks proxying
              }

              try {
                if (!keyOrSecret) {
                  throw new Error("JWT verification key or secret is not configured");
                }
                const decoded = verifyJwt(token, keyOrSecret);

                // Set context headers for downstream microservices
                request.headers["x-user-id"] = decoded.sub;
                if (decoded.email) {
                  request.headers["x-user-email"] = decoded.email;
                }
                if (decoded.roles) {
                  request.headers["x-user-roles"] = decoded.roles.join(",");
                }
              } catch (err) {
                reply.status(401).send({ message: `Unauthorized: ${err.message}` });
                return; // blocks proxying
              }
            }
          }
        });
      });
    });
  }
}
