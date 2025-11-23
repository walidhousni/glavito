# Meta WhatsApp + Instagram Setup Guide

Complete step-by-step guide to retrieve all credentials from Meta Business and configure webhooks.

## Prerequisites

- Meta Developer account (https://developers.facebook.com/)
- WhatsApp Business Account (WABA) or test phone number
- Instagram Professional account linked to a Facebook Page
- Your public tunnel URLs:
  - **Backend API**: `https://skunk-driving-oddly.ngrok-free.app`
  - **Admin Dashboard**: `https://adjust-longitude-integrating-very.trycloudflare.com`

---

## Part 1: WhatsApp Cloud API Setup

### Step 1.1: Create Meta App and Add WhatsApp Product

1. Go to https://developers.facebook.com/apps/
2. Click **"Create App"** → Select **"Business"** → Click **"Next"**
3. Fill in:
   - **App Name**: `Glavito Dev` (or your choice)
   - **App Contact Email**: Your email
   - **Business Account**: Select or create one
4. Click **"Create App"**
5. In your app dashboard, find **"Add a Product"** → Click **"WhatsApp"** → Click **"Set Up"**

### Step 1.2: Get WhatsApp Credentials

#### A) Phone Number ID (`WHATSAPP_PHONE_NUMBER_ID`)

1. In your app, go to **WhatsApp** → **API Setup** (left sidebar)
2. Find **"Phone number ID"** — copy this value
   - Example: `123456789012345`
3. Or: Go to **WhatsApp Manager** → **Phone Numbers** → Click your number → Copy **"Phone number ID"**

#### B) Business Account ID (`WHATSAPP_BUSINESS_ACCOUNT_ID`)

1. In **WhatsApp** → **API Setup**
2. Find **"WhatsApp Business Account ID"** — copy this value
   - Example: `987654321098765`
3. Or: Go to **Business Settings** → **Accounts** → **WhatsApp Accounts** → Copy the **WABA ID**

#### C) Access Token (`WHATSAPP_ACCESS_TOKEN`)

**Option 1: System User Token (Recommended for Production)**

1. Go to **Business Settings** → **Users** → **System Users**
2. Click **"Add"** → Select **"Admin"** → Click **"Create System User"**
3. Click **"Assign Assets"** → Select your **App** → Check **"WhatsApp Business Management"** → Click **"Save"**
4. Click **"Generate New Token"** → Select your **App** → Check scopes:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. Set **Token Expiration**: **Never** (or as long as needed)
6. Click **"Generate Token"** → **Copy the token immediately** (you won't see it again!)
   - Example: `EAAG...` (long string)

**Option 2: Temporary Token (Quick Testing Only)**

1. Go to **WhatsApp** → **API Setup**
2. Find **"Temporary access token"** → Click **"Generate Token"**
3. Copy the token (expires in ~24 hours)

#### D) Webhook Verify Token (`WHATSAPP_WEBHOOK_VERIFY_TOKEN`)

**You create this yourself** — choose any secure random string:
- Example: `glavito-wa-verify-2024-secret-key`
- Use the same value when configuring webhooks in Meta

#### E) App Secret (`FACEBOOK_APP_SECRET`)

1. Go to **Settings** → **Basic** (left sidebar)
2. Find **"App Secret"** → Click **"Show"**
3. Enter your password if prompted
4. Copy the **App Secret**
   - Example: `abc123def456...`

### Step 1.3: Configure WhatsApp Webhook

1. In your app, go to **WhatsApp** → **Configuration** (left sidebar)
2. Find **"Webhook"** section → Click **"Edit"**
3. Fill in:
   - **Callback URL**: `https://skunk-driving-oddly.ngrok-free.app/api/webhooks/whatsapp`
   - **Verify Token**: `glavito-wa-verify-2024-secret-key` (or your chosen token)
4. Click **"Verify and Save"**
5. Under **"Webhook fields"**, subscribe to:
   - ✅ `messages`
   - ✅ `message_status` (optional, for delivery receipts)
   - ✅ `message_template_status_update` (optional, for template updates)

### Step 1.4: Verify Webhook Connection

1. After saving, Meta will send a GET request to your webhook URL
2. Check your API logs — you should see a verification request
3. If successful, the webhook status will show **"Verified"** in Meta dashboard

---

## Part 2: Instagram Messaging Setup

### Step 2.1: Convert Instagram Account to Professional

1. Open Instagram app → Go to **Settings** → **Account**
2. Tap **"Switch to Professional Account"** → Follow the prompts
3. Choose **"Business"** (not Creator)
4. Link your Instagram account to a **Facebook Page** (create one if needed)

### Step 2.2: Link Instagram to Facebook Page

1. Go to your Facebook Page → **Settings** → **Linked Accounts**
2. Click **"Connect"** next to Instagram
3. Follow the prompts to link your Instagram Business account
4. **Note the Page ID** — you'll need it for `INSTAGRAM_PAGE_ID`

### Step 2.3: Add Instagram Graph API to Your App

1. In your Meta App dashboard, go to **"Add a Product"**
2. Find **"Instagram Graph API"** → Click **"Set Up"**
3. Also add **"Webhooks"** product (if not already added)

### Step 2.4: Get Instagram Credentials

#### A) Page ID (`INSTAGRAM_PAGE_ID`)

**Method 1: From Business Settings**
1. Go to **Business Settings** → **Accounts** → **Pages**
2. Find your linked Page → Copy the **Page ID**
   - Example: `123456789012345`

**Method 2: Via Graph API**
```bash
curl "https://graph.facebook.com/v18.0/me/accounts?access_token=<USER_ACCESS_TOKEN>"
```
Look for the page linked to your Instagram account.

#### B) Page Access Token (`INSTAGRAM_ACCESS_TOKEN`)

**Recommended: System User Token**

1. Go to **Business Settings** → **Users** → **System Users**
2. If you already created one for WhatsApp, use the same one
3. Click **"Assign Assets"** → Select your **Facebook Page**
4. Select permissions:
   - ✅ `instagram_manage_messages`
   - ✅ `pages_messaging`
   - ✅ `pages_manage_metadata`
   - ✅ `pages_read_engagement`
   - ✅ `pages_show_list`
5. Click **"Save"**
6. Click **"Generate New Token"** → Select your **App** → Check the Page permissions above
7. Set expiration → **Generate** → **Copy token immediately**

**Alternative: Page Access Token**
1. Go to **Graph API Explorer** (https://developers.facebook.com/tools/explorer/)
2. Select your **App** and **Page** from dropdowns
3. Check permissions: `instagram_manage_messages`, `pages_messaging`
4. Click **"Generate Access Token"**
5. Copy the token (may expire; use System User for production)

#### C) Webhook Verify Token (`INSTAGRAM_VERIFY_TOKEN`)

**You create this yourself** — choose any secure random string:
- Example: `glavito-ig-verify-2024-secret-key`
- Can be different from WhatsApp verify token

#### D) App Secret (`INSTAGRAM_APP_SECRET`)

Use the same **App Secret** from Step 1.2.E (or set `FACEBOOK_APP_SECRET`)

### Step 2.5: Configure Instagram Webhook

1. In your app, go to **Webhooks** (left sidebar)
2. Click **"Add Webhook"** or find existing webhook
3. Select **Object**: `instagram`
4. Fill in:
   - **Callback URL**: `https://skunk-driving-oddly.ngrok-free.app/api/webhooks/instagram`
   - **Verify Token**: `glavito-ig-verify-2024-secret-key` (or your chosen token)
5. Click **"Verify and Save"**
6. Subscribe to fields:
   - ✅ `messages`
   - ✅ `messaging_optins` (optional)
   - ✅ `messaging_postbacks` (optional)

### Step 2.6: Subscribe App to Page

1. Go to **Messenger** → **Settings** (or **Instagram** → **Settings**)
2. Find **"Add or Remove Pages"**
3. Select your **Page** → Click **"Next"**
4. Ensure webhook is subscribed

**Or via API:**
```bash
curl -X POST "https://graph.facebook.com/v18.0/{PAGE_ID}/subscribed_apps?subscribed_fields=messages&access_token={PAGE_ACCESS_TOKEN}"
```

---

## Part 3: Update Environment Variables

Edit `.env.development` and fill in all values:

```bash
# WhatsApp Cloud API
WHATSAPP_API_BASE_URL=https://graph.facebook.com/v18.0
WHATSAPP_ACCESS_TOKEN=<paste-your-token-from-step-1.2.C>
WHATSAPP_PHONE_NUMBER_ID=<paste-from-step-1.2.A>
WHATSAPP_BUSINESS_ACCOUNT_ID=<paste-from-step-1.2.B>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=glavito-wa-verify-2024-secret-key

# Instagram Graph API
INSTAGRAM_API_BASE_URL=https://graph.facebook.com/v18.0
INSTAGRAM_ACCESS_TOKEN=<paste-your-page-token-from-step-2.4.B>
INSTAGRAM_PAGE_ID=<paste-from-step-2.4.A>
INSTAGRAM_VERIFY_TOKEN=glavito-ig-verify-2024-secret-key
INSTAGRAM_APP_SECRET=<same-as-FACEBOOK_APP_SECRET>

# Meta App Secret (used for webhook signature verification)
FACEBOOK_APP_SECRET=<paste-from-step-1.2.E>
```

**Important**: Restart your API gateway after updating `.env.development`:
```bash
# Stop current API process, then:
npm run dev:api
```

---

## Part 4: Verify Credentials

Run the validation script:
```bash
bash scripts/validate-meta-credentials.sh
```

Or manually test:

**WhatsApp:**
```bash
curl "https://graph.facebook.com/v18.0/$WHATSAPP_PHONE_NUMBER_ID?fields=display_phone_number&access_token=$WHATSAPP_ACCESS_TOKEN"
```

**Instagram:**
```bash
curl "https://graph.facebook.com/v18.0/$INSTAGRAM_PAGE_ID?fields=name,instagram_business_accounts&access_token=$INSTAGRAM_ACCESS_TOKEN"
```

Both should return JSON with your phone number/page info.

---

## Part 5: Test Webhooks

### Test WhatsApp Inbound

1. Send a WhatsApp message from your phone to your business number
2. Check your API logs — you should see:
   - Webhook POST received
   - Conversation created/updated
   - Message saved
3. Check unified inbox: `GET /api/v1/conversations/advanced/unified-inbox`

### Test Instagram Inbound

1. Send a DM to your Instagram Business account
2. Check API logs — same flow as WhatsApp
3. Verify conversation appears in unified inbox

### Test Outbound (Both Channels)

Create a conversation and send a message:
```bash
# Create conversation
curl -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -X POST "http://localhost:3001/api/v1/conversations/advanced/create" \
  -d '{
    "customerId": "<CUSTOMER_ID>",
    "channelId": "<WHATSAPP_CHANNEL_ID>",
    "subject": "Test WA"
  }'

# Send message
curl -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -X POST "http://localhost:3001/api/v1/conversations/advanced/<CONVERSATION_ID>/messages" \
  -d '{"content":"Hello!","messageType":"text"}'
```

---

## Troubleshooting

### Webhook Verification Fails

- ✅ Ensure tunnel is running: `ngrok start --config ops/tunnels/ngrok.yml api-gateway`
- ✅ Check callback URL matches exactly: `https://skunk-driving-oddly.ngrok-free.app/api/webhooks/whatsapp`
- ✅ Verify token matches exactly in Meta dashboard and `.env.development`
- ✅ Check API logs for verification GET request

### Invalid Token Errors

- ✅ Regenerate System User token if expired
- ✅ Ensure token has correct scopes/permissions
- ✅ For Instagram: ensure Page is linked and token has `instagram_manage_messages`

### Webhook Not Receiving Events

- ✅ Check webhook is **subscribed** to correct fields (`messages`)
- ✅ Verify app is subscribed to your WABA/Page
- ✅ Check webhook status shows **"Verified"** in Meta dashboard
- ✅ Ensure tunnel is still running (ngrok free tier may have limits)

### CORS Errors from Frontend

- ✅ Verify `CORS_ORIGIN` in `.env.development` includes your Cloudflare frontend URL
- ✅ Restart API after changing CORS settings

---

## Next Steps

1. ✅ Fill all credentials in `.env.development`
2. ✅ Restart API gateway
3. ✅ Verify webhooks are connected
4. ✅ Seed WhatsApp and Instagram channels via API
5. ✅ Test inbound/outbound messages
6. ✅ Verify unified inbox shows conversations

See `scripts/seed-channels.sh` for channel seeding, or use the Channels API directly.

