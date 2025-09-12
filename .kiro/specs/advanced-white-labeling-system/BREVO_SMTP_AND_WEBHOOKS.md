## Brevo SMTP & Webhooks Setup

This guide explains how to configure SMTP sending via Brevo and enable delivery event webhooks for tracking in the white-label system.

### 1) SMTP Credentials

- Host: `smtp-relay.brevo.com`
- Port: `587` (TLS) or `465` (SSL)
- Username: `apikey`
- Password: `<your_brevo_api_key>`
- From: `Your Brand <noreply@yourdomain.com>`

Configure per-tenant under Admin → Settings → SMTP.

### 2) DKIM/SPF/DMARC

- SPF TXT on root: `v=spf1 include:spf.brevo.com ~all`
- DKIM CNAME: `mail._domainkey.<yourdomain> -> mail.domainkey.brevo.com`
- DMARC TXT: `_dmarc.<yourdomain> -> v=DMARC1; p=none; rua=mailto:dmarc@<yourdomain>`

Use the SMTP panel “Get DKIM/SPF/DMARC Records” to generate guidance, then “Validate DNS” to verify.

### 3) Webhook for Events

Brevo can POST events (delivered/bounce/spam/failure) to your API:

- Endpoint: `POST /api/white-label/email/webhook`
- Expected fields: `messageId` | `MessageID` | `message_id` | `message-id`, and `event` | `Event` | `type`

In Brevo dashboard: Transactional → Settings → Webhooks → Add webhook

- URL: `https://<your-api-host>/api/white-label/email/webhook`
- Events: select Delivered, Bounced, Blocked/Failed, Spam/Complaint
- Format: JSON
- Secret (optional): if using, extend controller to verify signature

### 4) Testing Tips

- Send a test email from Email Templates panel. Delivery should appear under “Recent test deliveries”.
- Opening the message triggers an open pixel; clicking a link triggers a tracked redirect.
- After enabling webhooks, Brevo events should change delivery status to `delivered`, `bounced`, or `failed`.

### 5) Troubleshooting

- DKIM CNAME not found: check that your DNS provider requires a trailing dot or not, and that `mail._domainkey` is created exactly.
- SPF multiple TXT: merge into a single SPF TXT as most providers only honor one SPF record.
- Webhook not firing: verify Brevo can reach your public API URL and no auth is required for the endpoint.


