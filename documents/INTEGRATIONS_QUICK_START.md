# Integrations Quick Start Guide 🚀

## Prerequisites

1. **Database Migration**
   ```bash
   cd /path/to/glavito-workspace
   npx prisma migrate deploy
   npx prisma generate
   ```

2. **Environment Variables**
   Add to your `.env` file:
   ```bash
   # Salesforce
   SALESFORCE_CLIENT_ID=your_salesforce_client_id
   SALESFORCE_CLIENT_SECRET=your_salesforce_client_secret
   
   # HubSpot
   HUBSPOT_CLIENT_ID=your_hubspot_client_id
   HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret
   ```

3. **Optional Dependencies** (for full experience)
   ```bash
   cd apps/admin-dashboard
   npm install canvas-confetti date-fns @types/canvas-confetti
   ```

## Getting OAuth Credentials

### Salesforce
1. Go to https://developer.salesforce.com/
2. Create a new Connected App
3. Enable OAuth Settings
4. Set callback URL: `http://localhost:3000/api/oauth/return`
5. Copy Client ID and Client Secret

### HubSpot
1. Go to https://developers.hubspot.com/
2. Create a new app
3. Set redirect URL: `http://localhost:3000/api/oauth/return`
4. Copy Client ID and Client Secret

## Using the Integrations UI

### 1. Access the Integrations Page
Navigate to: `http://localhost:3000/dashboard/integrations`

### 2. Connect Your First Integration

**Step 1**: Browse available integrations  
- Use the search bar to find your CRM
- Or filter by category (CRM, Communication, etc.)

**Step 2**: Click "Connect" on your desired integration  
- A modal will open showing required permissions
- Click "Authorize Access"

**Step 3**: Complete OAuth flow  
- A popup window will open
- Log in to your CRM account
- Authorize Glavito to access your data
- The popup will close automatically on success

**Step 4**: Celebrate! 🎉  
- Confetti animation (if canvas-confetti installed)
- Integration card updates to "Connected" status
- Initial sync begins automatically

### 3. Manual Sync

Once connected, you can manually trigger a sync:
1. Find your connected integration
2. Click the "Sync Now" button
3. Watch real-time progress in the sync modal
4. View imported records count

### 4. Configure Integration

Click the settings icon (⚙️) on a connected integration to:
- View sync history
- Adjust sync interval
- Enable/disable auto-ticket creation
- Configure field mappings (coming soon)

### 5. Disable Integration

Click the trash icon (🗑️) to disconnect an integration:
- Stops automatic syncing
- Preserves historical data
- Can be reconnected anytime

## How Syncing Works

### Automatic Sync
- Runs every 10 minutes by default (configurable)
- Only syncs enabled integrations
- Syncs: Customers → Leads → Deals (if applicable)
- Updates last sync timestamp
- Logs all sync operations

### Manual Sync
- Triggered from UI "Sync Now" button
- Shows real-time progress modal
- Displays:
  - Overall progress percentage
  - Entity-by-entity breakdown
  - Imported/Updated/Skipped counts
  - Any errors encountered
  - Sync summary on completion

### What Gets Synced

#### Customers (from CRM Contacts)
- Email (required)
- First Name
- Last Name
- Phone
- Company
- Custom fields (via field mapping)

#### Leads (from CRM Leads)
- All customer fields above
- Lead source
- Lead status (mapped to Glavito statuses)
- Lead score (auto-calculated)
- Tags

#### Auto-Created Tickets (optional)
If `autoCreateTickets` is enabled:
- Creates ticket for each new lead
- Links to customer
- Sets priority based on lead data
- Adds "crm-lead" tag

## Field Mapping

### Default Mappings

**Salesforce → Glavito:**
```
Email → email
FirstName → firstName
LastName → lastName
Phone → phone
Company (or Account.Name) → company
```

**HubSpot → Glavito:**
```
email → email
firstname → firstName
lastname → lastName
phone → phone
company → company
```

### Custom Mappings (Coming Soon)
- Visual field mapping builder
- Drag-and-drop connections
- Transformation rules
- Save mapping presets

## Monitoring & Troubleshooting

### Check Sync Status
1. Go to integrations page
2. Look for status indicators:
   - 🟢 **Connected** - Active and ready
   - 🔵 **Syncing** - Currently syncing (animated)
   - 🔴 **Error** - Last sync failed
   - ⚪ **Disabled** - Not syncing

### View Last Sync
Each integration card shows:
- "Last synced X minutes ago"
- Hover for exact timestamp

### Check Backend Logs
```bash
# View sync scheduler logs
tail -f api-gateway/logs/app.log | grep IntegrationsSyncScheduler

# View CRM sync service logs
tail -f api-gateway/logs/app.log | grep CrmSyncService
```

### Common Issues

**OAuth popup blocked**
- Allow popups for your domain
- Try again

**"Missing credentials" error**
- Check `.env` file has CLIENT_ID and CLIENT_SECRET
- Restart backend server

**"Token expired" error**
- Token refresh not yet implemented
- Disconnect and reconnect integration

**Sync fails silently**
- Check backend logs for errors
- Verify CRM API permissions
- Check rate limits

## API Endpoints

### Get Integration Status
```http
GET /integrations/connectors
Authorization: Bearer <token>
```

### Get Catalog
```http
GET /integrations/catalog
Authorization: Bearer <token>
```

### Manual Sync
```http
POST /integrations/connectors/:provider/sync
Content-Type: application/json
Authorization: Bearer <token>

{
  "entity": "customers"
}
```

### Get Sync History
```http
GET /integrations/connectors/:provider/sync-history
Authorization: Bearer <token>
```

### Disable Integration
```http
PATCH /integrations/connectors/:provider/disable
Authorization: Bearer <token>
```

## Best Practices

### 1. Start Small
- Connect one integration at a time
- Test with a small dataset first
- Verify data mapping is correct

### 2. Monitor Initial Sync
- Watch the sync progress modal
- Check imported record counts
- Verify data in Customers/Leads pages

### 3. Configure Sync Settings
- Adjust sync interval based on your needs
  - More frequent = more up-to-date data
  - Less frequent = lower API usage
- Enable auto-ticket creation only if needed

### 4. Use Field Mapping
- Review default mappings
- Customize for your CRM field names
- Test with sample data

### 5. Handle Errors Gracefully
- Check sync status regularly
- Review error logs
- Reconnect if needed

## Performance Tips

### Reduce API Calls
- Increase sync interval (e.g., 30 minutes instead of 10)
- Use webhooks for real-time updates (coming soon)
- Disable sync for unused integrations

### Optimize Data Transfer
- Only sync changed records (incremental sync)
- Limit fields with custom mappings
- Use pagination for large datasets

### Scale for Multiple Integrations
- Sync runs in background (non-blocking)
- Each integration syncs independently
- Concurrent sync prevention built-in

## What's Next?

### Upcoming Features
1. **Visual Field Mapping Builder** - Drag-and-drop UI
2. **Webhook Support** - Real-time sync
3. **Bi-directional Sync** - Export to CRM
4. **Analytics Dashboard** - Sync metrics
5. **More CRM Adapters** - Zoho, Pipedrive, etc.

### Your Feedback
Help us improve! Report issues or suggest features:
- Backend issues → Check logs and create ticket
- UI issues → Take screenshot and report
- Feature requests → Document use case

## Resources

- **Plan Document**: `complete-integrations.plan.md`
- **Implementation Summary**: `INTEGRATIONS_OVERHAUL_COMPLETE.md`
- **API Documentation**: `/integrations/docs/:provider`
- **Prisma Schema**: `prisma/schema.prisma`

---

**Happy Integrating! 🎉**

For support, check the backend logs or review the implementation summary document.

