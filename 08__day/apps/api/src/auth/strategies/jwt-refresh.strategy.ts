import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { JwtPayload } from './jwt.strategy';

function extractRefreshToken(req: Request): string | null {
  // Accept the refresh token either in the JSON body or as a Bearer header,
  // so both "POST /auth/refresh { refreshToken }" and header-based clients work.
  if (req.body?.refreshToken) return req.body.refreshToken;
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: extractRefreshToken,
      ignoreExpiration: false,
      secretOrKey: config.get<string>('jwt.refreshSecret')!,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const refreshToken = extractRefreshToken(req);
    return { id: payload.sub, email: payload.email, refreshToken };
  }
}
