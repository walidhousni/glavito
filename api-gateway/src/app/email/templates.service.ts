import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailTemplatesService {
  compile(html: string, _variables: Record<string, unknown> = {}): { html: string; text?: string } {
    // Keep minimal to avoid new dependencies; implement MJML/Juice later
    return { html };
  }
}


