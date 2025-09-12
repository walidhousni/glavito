import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = configService.get<string>('GITHUB_CLIENT_SECRET');
    
    if (!clientID || !clientSecret) {
      throw new Error('GitHub OAuth credentials not configured');
    }
    
    super({
      clientID,
      clientSecret,
      callbackURL: '/api/auth/github/callback',
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user?: any) => void,
  ): Promise<any> {
    const { username, emails, photos, id } = profile;
    const user = {
      email: emails[0].value,
      firstName: username,
      lastName: '',
      picture: photos[0]?.value || null,
      provider: 'github',
      providerId: id,
      accessToken,
    };
    done(null, user);
  }
}