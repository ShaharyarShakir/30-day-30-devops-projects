import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  private static readonly logger = new Logger(GithubStrategy.name);

  constructor(config: ConfigService) {
    const clientID = config.get<string>('github.clientId');
    const clientSecret = config.get<string>('github.clientSecret');

    if (!clientID || !clientSecret) {
      // passport-github2 throws synchronously in its constructor if these are
      // missing, which would crash the whole Nest app on boot. Fall back to
      // placeholders so the app still starts; hitting /auth/github will just
      // get an "invalid client" error from GitHub until real credentials are
      // set in .env, instead of the entire API refusing to boot.
      GithubStrategy.logger.warn(
        'GITHUB_OAUTH_CLIENT_ID/SECRET not set -- GitHub login is disabled until configured',
      );
    }

    super({
      clientID: clientID || 'not-configured',
      clientSecret: clientSecret || 'not-configured',
      callbackURL: config.get<string>('github.callbackUrl'),
      scope: ['user:email'],
    });
  }

  // Whatever this returns becomes req.user inside the /auth/github/callback
  // route -- AuthService.loginWithGithub() turns it into our own user record.
  async validate(_accessToken: string, _refreshToken: string, profile: Profile) {
    const primaryEmail = profile.emails?.[0]?.value;
    return {
      githubId: profile.id,
      email: primaryEmail,
      username: profile.username,
    };
  }
}
