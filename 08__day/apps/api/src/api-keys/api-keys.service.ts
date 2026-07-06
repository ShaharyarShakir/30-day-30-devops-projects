import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as crypto from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(private dataSource: DataSource) {}

  async createKey(orgId: string, name: string, scopes: string[], expiresDays?: number) {
    if (!orgId || !name) {
      throw new BadRequestException('Organization ID and Name are required.');
    }

    // Generate secure random string prefixed with "cd_"
    const rawKey = 'cd_' + crypto.randomBytes(32).toString('hex');
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const expiresAt = expiresDays 
      ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000) 
      : null;

    // Save hash to database
    await this.dataSource.query(
      `INSERT INTO api_keys (organization_id, name, key_hash, scopes, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [orgId, name, keyHash, scopes || ['read'], expiresAt],
    );

    return {
      name,
      apiKey: rawKey,
      scopes,
      expiresAt,
    };
  }

  async getKeys(orgId: string) {
    return this.dataSource.query(
      `SELECT id, name, scopes, expires_at, last_used_at, created_at 
       FROM api_keys WHERE organization_id = $1 ORDER BY created_at DESC`,
      [orgId],
    );
  }

  async revokeKey(id: string, orgId: string) {
    await this.dataSource.query(
      'DELETE FROM api_keys WHERE id = $1 AND organization_id = $2',
      [id, orgId],
    );
    return { success: true };
  }
}
