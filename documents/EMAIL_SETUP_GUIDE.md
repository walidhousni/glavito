# Email Providers Setup Guide (BYO ESP)

This guide explains how to connect your own email provider per tenant and enable sending, tracking, and compliance.

## Supported Providers
- SMTP (any provider)
- AWS SES
- SendGrid
- Alibaba Cloud DirectMail

Each tenant can add one or more providers and mark a primary provider used by default.

## Where to Configure
- Admin Dashboard → Settings → Email → Email Providers
- Backend endpoints:
  - GET/POST/PATCH/DELETE `/tenants/me/email/providers`
  - POST `/tenants/me/email/providers/:id/verify-domain`

Provider configs are stored in Prisma model `tenant_email_provider_configs` and credentials are encrypted at rest when `DATA_ENCRYPTION_KEY` is set.

## DNS Configuration
Always set up SPF, DKIM, and DMARC on your sending domain:
- SPF: `v=spf1 include:<provider> -all`
- DKIM: Provider supplies CNAME/TXT records
- DMARC: `v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`

Recommended: Configure a dedicated tracking domain (CNAME) for click/open tracking if your provider supports it.

## Provider Notes

### SMTP
- Credentials JSON example:
```json
{
  "host": "smtp.example.com",
  "port": 587,
  "secure": false,
  "user": "apikey",
  "pass": "your-api-key"
}
```
- Use TLS when possible. SMTP does not expose webhooks; opens/clicks are tracked via our pixel/redirect; bounces handled via provider inbox/rules if available.

### AWS SES
- Verify your domain in SES console and set DKIM/MAIL FROM
- Create IAM user/role with `ses:SendEmail`
- Credentials JSON example:
```json
{ "region": "us-east-1", "accessKeyId": "...", "secretAccessKey": "..." }
```
- Set SNS topics and subscribe `/email/webhooks/ses` via HTTPS if desired for delivery/bounce/complaint.

### SendGrid
- Create API Key (Mail Send + Event Webhook scope)
- Credentials JSON example:
```json
{ "apiKey": "SG.xxxxx", "ipPool": "default" }
```
- Configure Event Webhook to `POST https://<your-api>/email/webhooks/sendgrid`

### Alibaba Cloud DirectMail
- Verify your domain (Domain Management) and set DKIM/SMTP settings
- Credentials JSON example:
```json
{ "region": "cn-hangzhou", "accessKeyId": "...", "accessKeySecret": "...", "accountName": "noreply@yourdomain.com" }
```
- Configure event callback URL to `POST https://<your-api>/email/webhooks/aliyun`

## Sending
- API: `POST /email/send`
```json
{
  "tenantId": "<tenant-id>",
  "subject": "Hello",
  "html": "<p>Hi</p>",
  "personalizations": [{ "toEmail": "user@example.com", "toName": "User" }],
  "campaignId": "segment-id",
  "tracking": { "open": true, "click": true }
}
```
- Rate limiting is enforced per tenant/provider. Configure `ratePerSecond` in the provider config.

## Tracking and Unsubscribe
- Open pixel: `GET /email/open.gif?m=<deliveryId>&t=<tenantId>`
- Click redirect: `GET /email/c/<token>` where token is base64 JSON `{ "m": "<deliveryId>", "t": "<tenantId>", "u": "<url>" }`
- Unsubscribe: `GET /email/u/<token>` with base64 JSON `{ "m": "<deliveryId>", "t": "<tenantId>" }`
- Suppressions stored in `email_suppressions`. Check suppression before sends to respect opt-outs (implement at adapter/service layer).

Add `List-Unsubscribe` header and footer link in templates:
```
List-Unsubscribe: <mailto:unsubscribe@yourdomain.com>, <https://<your-api>/email/u/<token>>
```

## Compliance
- Honor user consent preferences. Do not email customers in `email_suppressions`.
- Store credentials encrypted. Set `DATA_ENCRYPTION_KEY`.
- Provide unsubscribe in every marketing email.
- Use verified sending domains and strong DMARC policy (`p=quarantine` or `p=reject`) in production.

## Troubleshooting
- DNS validation: Use Admin → Email → SMTP to fetch DNS records guidance.
- Low deliverability: Warm up IPs/domains, authenticate all records, avoid spammy content, maintain clean lists.
- Bounces/complaints: Ensure webhooks are configured; entries will appear in `email_events` and update `email_deliveries.status`.


