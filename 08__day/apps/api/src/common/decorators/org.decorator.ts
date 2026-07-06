import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Org = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.org;
  },
);
