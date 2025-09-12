import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('MICROSOFT_CLIENT_ID');
    const clientSecret = configService.get<string>('MICROSOFT_CLIENT_SECRET');
    
    if (!clientID || !clientSecret) {
      throw new Error('Microsoft OAuth credentials not configured');
    }
    
    super({
      clientID,
      clientSecret,
      callbackURL: '/api/auth/microsoft/callback',
      scope: ['user.read'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (err: any, user?: any) => void,
  ): Promise<any> {
    const { displayName, emails, id } = profile;
    const [firstName, ...lastNameParts] = displayName.split(' ');
    const lastName = lastNameParts.join(' ');

    const user = {
      email: emails[0].value,
      firstName,
      lastName,
      provider: 'microsoft',
      providerId: id,
      accessToken,
    };
    done(null, user);
  }
}