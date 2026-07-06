import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Pulls the payload attached by JwtStrategy.validate() (req.user) off the
 * request. Use on any route behind JwtAuthGuard: `@CurrentUser() user`.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
