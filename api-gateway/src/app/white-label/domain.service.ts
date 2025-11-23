
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { randomUUID } from 'crypto';
import { promises as dns } from 'dns';

export interface CreateDomainRequest {
  domain: string;
  portalId?: string;
}

@Injectable()
export class DomainService {
  constructor(private readonly db: DatabaseService) {}

  async listDomains(tenantId: string) {
    const domains = await this.db.customDomain.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
    return Array.isArray(domains) ? domains : [];
  }

  async createDomain(tenantId: string, payload: CreateDomainRequest) {
    const domain = (payload.domain || '').trim().toLowerCase();
    if (!domain) throw new BadRequestException('Domain is required');
    const portalId = payload.portalId || 'default';

    const existing = await this.db.customDomain.findFirst({ where: { tenantId, domain } });
    if (existing) throw new BadRequestException('Domain already exists');

    const verificationToken = `glavito-verify=${randomUUID()}`;
    const dnsRecords = [
      {
        type: 'TXT',
        name: `_glavito.${domain}`,
        value: verificationToken,
        ttl: 300,
      },
    ];

    const created = await this.db.customDomain.create({
      data: {
        tenantId,
        portalId,
        domain,
        status: 'pending',
        verificationToken,
        dnsRecords: dnsRecords as any,
        sslStatus: 'pending',
        metadata: {},
      },
    });
    return created;
  }

  async deleteDomain(tenantId: string, id: string) {
    const found = await this.db.customDomain.findFirst({ where: { id, tenantId } });
    if (!found) throw new NotFoundException('Domain not found');
    await this.db.customDomain.delete({ where: { id } });
    return { success: true } as const;
  }

  async checkVerification(tenantId: string, id: string) {
    const record = await this.db.customDomain.findFirst({ where: { id, tenantId } });
    if (!record) throw new NotFoundException('Domain not found');
    const domain = record.domain;
    const token = (record.verificationToken || '').trim();
    const host = `_glavito.${domain}`;

    let ok = false;
    let errorMessage: string | undefined;
    try {
      const txt = await dns.resolveTxt(host);
      const flat = txt.flat().map((p) => p.trim());
      ok = flat.includes(token);
      if (!ok) errorMessage = `TXT record not found on ${host}`;
    } catch (err: any) {
      errorMessage = err?.message || 'DNS query failed';
    }

    const updated = await this.db.customDomain.update({
      where: { id },
      data: {
        status: ok ? 'active' : 'pending',
        verifiedAt: ok ? new Date() : null,
        errorMessage: ok ? null : errorMessage,
        lastCheckedAt: new Date(),
      },
    });
    return updated;
  }

  async requestSSL(tenantId: string, id: string) {
    const record = await this.db.customDomain.findFirst({ where: { id, tenantId } });
    if (!record) throw new NotFoundException('Domain not found');
    if (record.status !== 'active') {
      throw new BadRequestException('Domain must be verified before requesting SSL. Please verify DNS configuration first.');
    }
    if (record.sslStatus === 'active') {
      throw new BadRequestException('SSL certificate already active for this domain');
    }

    // Update status to indicate SSL request is in progress
    // In production, integrate with ACME (Let's Encrypt) and chosen DNS provider/API
    // For now, mark as active with a note that this is a placeholder
    const updated = await this.db.customDomain.update({
      where: { id },
      data: {
        sslStatus: 'active',
        sslCertificate: {
          issuedAt: new Date(),
          provider: 'internal',
          note: 'Placeholder certificate - ACME integration pending',
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days placeholder
        } as any,
        lastCheckedAt: new Date(),
      },
    });
    return updated;
  }

  // Email DNS guidance (SPF/DKIM/DMARC)
  async getEmailDnsGuidance(tenantId: string, domain: string) {
    const tenant = await this.db.tenant.findUnique({ where: { id: tenantId } });
    const settings: any = (tenant as any)?.whiteLabelSettings || {};
    const smtp: any = settings?.smtp || {};
    const host: string = String(smtp?.host || '').toLowerCase();
    const isBrevo = host.includes('brevo') || host.includes('sendinblue');
    const isSendgrid = host.includes('sendgrid');
    const isPostmark = host.includes('postmark');
    const isMailgun = host.includes('mailgun');
    const records: Array<{ type: 'TXT' | 'CNAME'; name: string; value: string; ttl: number; purpose: string }> = [];
    // SPF
    const spfValue = isBrevo
      ? 'v=spf1 include:spf.brevo.com ~all'
      : isSendgrid
      ? 'v=spf1 include:sendgrid.net ~all'
      : isPostmark
      ? 'v=spf1 a mx include:spf.mtasv.net ~all'
      : isMailgun
      ? 'v=spf1 include:mailgun.org ~all'
      : 'v=spf1 mx ~all';
    records.push({ type: 'TXT', name: domain, value: spfValue, ttl: 300, purpose: 'SPF' });
    // DKIM (recommend default selector "mail")
    if (isBrevo) {
      records.push({ type: 'CNAME', name: `mail._domainkey.${domain}`, value: 'mail.domainkey.brevo.com', ttl: 300, purpose: 'DKIM' });
    } else if (isSendgrid) {
      records.push({ type: 'CNAME', name: `s1._domainkey.${domain}`, value: 's1.domainkey.uXXXXXXX.wl.sendgrid.net', ttl: 300, purpose: 'DKIM (example, replace uXXXXXXX)' });
      records.push({ type: 'CNAME', name: `s2._domainkey.${domain}`, value: 's2.domainkey.uXXXXXXX.wl.sendgrid.net', ttl: 300, purpose: 'DKIM (example, replace uXXXXXXX)' });
    } else if (isPostmark) {
      records.push({ type: 'CNAME', name: `pm._domainkey.${domain}`, value: 'pm.mtasv.net', ttl: 300, purpose: 'DKIM' });
    } else if (isMailgun) {
      records.push({ type: 'CNAME', name: `smtp._domainkey.${domain}`, value: 'smtp.mailgun.org', ttl: 300, purpose: 'DKIM' });
    } else {
      records.push({ type: 'CNAME', name: `mail._domainkey.${domain}`, value: 'provider-domainkey.example.com', ttl: 300, purpose: 'DKIM' });
    }
    // DMARC guidance (optional safe default)
    records.push({ type: 'TXT', name: `_dmarc.${domain}`, value: 'v=DMARC1; p=none; rua=mailto:dmarc@' + domain, ttl: 300, purpose: 'DMARC' });
    const provider = isBrevo ? 'brevo' : isSendgrid ? 'sendgrid' : isPostmark ? 'postmark' : isMailgun ? 'mailgun' : 'custom';
    return { domain, provider, records } as const;
  }

  async validateEmailDns(tenantId: string, domain: string) {
    // Validate domain format
    if (!domain || !domain.includes('.')) {
      throw new BadRequestException('Invalid domain format');
    }
    
    const guidance = await this.getEmailDnsGuidance(tenantId, domain);
    const isBrevo = guidance.provider === 'brevo';
    const isSendgrid = guidance.provider === 'sendgrid';
    const isPostmark = guidance.provider === 'postmark';
    const isMailgun = guidance.provider === 'mailgun';
    const results: any = { domain, provider: guidance.provider, checks: { spf: null, dkim: null, dmarc: null }, passed: false };
    // SPF check
    try {
      const txts = await dns.resolveTxt(domain);
      const flat = txts.map((chunks) => chunks.join(''));
      const spf = flat.find((t) => t.toLowerCase().startsWith('v=spf1')) || '';
      const hasSpf = !!spf;
      const okInclude = isBrevo
        ? spf.includes('include:spf.brevo.com')
        : isSendgrid
        ? spf.includes('include:sendgrid.net')
        : isPostmark
        ? spf.includes('include:spf.mtasv.net')
        : isMailgun
        ? spf.includes('include:mailgun.org')
        : true;
      results.checks.spf = { found: hasSpf, value: spf || null, includeOk: okInclude };
    } catch (e: any) {
      results.checks.spf = { found: false, error: e?.message };
    }
    // DKIM check (selector: mail)
    const dkimHost = isBrevo ? `mail._domainkey.${domain}` : isSendgrid ? `s1._domainkey.${domain}` : isPostmark ? `pm._domainkey.${domain}` : isMailgun ? `smtp._domainkey.${domain}` : `mail._domainkey.${domain}`;
    try {
      const cname = await dns.resolveCname(dkimHost);
      const value = cname?.[0] || '';
      const ok = !!value;
      const providerTargetOk = isBrevo
        ? value.includes('domainkey.brevo.com')
        : isSendgrid
        ? value.includes('sendgrid.net')
        : isPostmark
        ? value.includes('mtasv.net')
        : isMailgun
        ? value.includes('mailgun.org')
        : true;
      results.checks.dkim = { found: ok, type: 'CNAME', value: value || null, targetOk: providerTargetOk };
    } catch {
      try {
        const txts = await dns.resolveTxt(dkimHost);
        const flat = txts.map((chunks) => chunks.join(''));
        const rec = flat.find((t) => t.toLowerCase().includes('v=dkim1')) || '';
        results.checks.dkim = { found: !!rec, type: 'TXT', value: rec || null };
      } catch (e2: any) {
        results.checks.dkim = { found: false, error: e2?.message };
      }
    }
    // DMARC check
    const dmarcHost = `_dmarc.${domain}`;
    try {
      const txts = await dns.resolveTxt(dmarcHost);
      const flat = txts.map((chunks) => chunks.join(''));
      const rec = flat.find((t) => t.toLowerCase().startsWith('v=dmarc1')) || '';
      results.checks.dmarc = { found: !!rec, value: rec || null };
    } catch (e: any) {
      results.checks.dmarc = { found: false, error: e?.message };
    }
    const includeOk = (results.checks.spf && (results.checks.spf as any).includeOk) !== false;
    const spfOk = results.checks.spf?.found && includeOk;
    const dkimOk = results.checks.dkim?.found && (results.checks.dkim as any)?.targetOk !== false;
    const dmarcOk = results.checks.dmarc?.found;
    
    results.passed = !!(spfOk && dkimOk && dmarcOk);
    results.summary = {
      spf: spfOk ? 'valid' : 'missing_or_invalid',
      dkim: dkimOk ? 'valid' : 'missing_or_invalid',
      dmarc: dmarcOk ? 'valid' : 'missing_or_invalid',
    };
    
    return results;
  }
}


