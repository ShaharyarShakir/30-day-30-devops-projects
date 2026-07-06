import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { DataSource } from 'typeorm';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private dataSource: DataSource) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, user, org, body } = request;

    // Action representation (e.g. POST /projects)
    const action = `${method} ${url}`;

    return next.handle().pipe(
      tap(async () => {
        // Only log database state mutations (POST, PUT, DELETE, PATCH)
        if (method === 'GET') {
          return;
        }

        const userId = user?.id || null;
        const orgId = org?.id || null;

        // Clone and sanitize body metadata
        const sanitizedBody = { ...body };
        const sensitiveKeys = ['password', 'password_hash', 'passwordHash', 'apiKey', 'secret', 'privateKey', 'private_key'];
        sensitiveKeys.forEach(key => {
          if (key in sanitizedBody) {
            sanitizedBody[key] = '[REDACTED]';
          }
        });

        const logMetadata = {
          ip,
          body: sanitizedBody,
        };

        try {
          await this.dataSource.query(
            `INSERT INTO audit_logs (user_id, organization_id, action, metadata)
             VALUES ($1, $2, $3, $4)`,
            [
              userId !== 'api-key-user' ? userId : null,
              orgId,
              action,
              JSON.stringify(logMetadata),
            ],
          );
        } catch (e) {
          console.error('[AUDIT LOG ERROR] Failed to write audit log:', e);
        }
      }),
    );
  }
}
