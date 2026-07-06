import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private dataSource: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      // Let other guards (JWT guard) check the credentials if no key is provided
      return true;
    }

    // Hash the API key using SHA-256
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Query key details in database
    const keys = await this.dataSource.query(
      `SELECT id, organization_id, scopes, expires_at 
       FROM api_keys WHERE key_hash = $1`,
      [keyHash],
    );

    if (!keys || keys.length === 0) {
      throw new UnauthorizedException('Invalid API Key.');
    }

    const key = keys[0];

    // Check expiration date
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      throw new UnauthorizedException('API Key has expired.');
    }

    // Update last used timestamp asynchronously
    this.dataSource.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [key.id],
    ).catch(() => {});

    // Inject virtual user and org contexts into request object
    request.user = { id: 'api-key-user', email: 'api-key@service.local' };
    request.org = { id: key.organization_id, role: 'developer', isApiKey: true, scopes: key.scopes };
    request.headers['x-organization-id'] = key.organization_id;

    return true;
  }
}
