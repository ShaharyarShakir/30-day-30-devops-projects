import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private dataSource: DataSource,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const orgId = request.headers['x-organization-id'] || request.params.orgId || request.body.organizationId;

    if (!user || !orgId) {
      throw new ForbiddenException('User or Organization ID not found in request context.');
    }

    // Query organization membership and role
    const member = await this.dataSource.query(
      'SELECT role FROM organization_members WHERE organization_id = $1 AND user_id = $2',
      [orgId, user.id],
    );

    if (!member || member.length === 0) {
      throw new ForbiddenException('You are not a member of this organization.');
    }

    const userRole = member[0].role;
    const hasRole = requiredRoles.includes(userRole);
    if (!hasRole) {
      throw new ForbiddenException(`Require one of the following roles: ${requiredRoles.join(', ')}`);
    }

    // Attach org context to request for downstream decorators/handlers
    request.org = { id: orgId, role: userRole };

    return true;
  }
}
