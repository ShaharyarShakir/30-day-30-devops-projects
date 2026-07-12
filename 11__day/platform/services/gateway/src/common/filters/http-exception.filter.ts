import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: "Internal server error" };

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      requestId: (request.headers["x-request-id"] as string) || request.id,
      error:
        typeof message === "object" && message !== null
          ? (message as any).error || (message as any).message || message
          : message
    };

    // Log the exception in structured format
    console.error(
      JSON.stringify({
        timestamp: errorResponse.timestamp,
        service: "gateway",
        level: "error",
        requestId: errorResponse.requestId,
        message: `Exception occurred: ${
          exception instanceof Error ? exception.message : exception
        }`,
        stack: exception instanceof Error ? exception.stack : undefined,
        path: request.url,
        status
      })
    );

    response.status(status).send(errorResponse);
  }
}
