# 🚀 Quick Start: n8n Integration with Glavito

## What We've Set Up

Your Glavito ticketing system now has complete n8n workflow automation integration! Here's what's been configured:

### ✅ Configuration Files Updated
- **`.env`** - Added n8n URL and API key variables
- **`.env.example`** - Added n8n configuration template
- **`docker-compose.yml`** - Added n8n service with PostgreSQL backend
- **`package.json`** - Added convenient n8n management scripts

### ✅ Scripts Created
- **`scripts/setup-n8n.js`** - Automated n8n setup script
- **`scripts/test-n8n-integration.js`** - Integration testing script

### ✅ Documentation
- **`N8N_INTEGRATION.md`** - Comprehensive integration guide
- **`QUICK_START_N8N.md`** - This quick start guide

## 🎯 Getting Started (5 Minutes)

### Step 1: Start n8n
```bash
npm run n8n:setup
# OR manually:
# docker-compose up -d postgres n8n
```

### Step 2: Configure API Access
1. Open http://localhost:5678
2. Login with `admin` / `admin123`
3. Go to Settings > API Keys
4. Create new API key
5. Update `.env`:
   ```env
   N8N_API_KEY=your-generated-api-key
   ```

### Step 3: Test Integration
```bash
npm run n8n:test
```

### Step 4: Start Full System
```bash
docker-compose up -d
```

## 🎉 You're Ready!

Your system now supports:
- ✅ **Auto-ticket assignment** based on keywords
- ✅ **Sentiment-based escalation** for negative feedback
- ✅ **Custom workflow creation** through n8n UI
- ✅ **Multi-channel automation** (WhatsApp, Instagram, Email)
- ✅ **SLA monitoring** and automatic escalation
- ✅ **AI-powered** ticket analysis and routing

## 🛠️ Available Commands

```bash
# n8n Management
npm run n8n:setup     # Initial setup
npm run n8n:start     # Start n8n service
npm run n8n:stop      # Stop n8n service
npm run n8n:test      # Test integration
npm run n8n:logs      # View n8n logs

# Full System
npm run dev:docker    # Start all services
npm run docker:down   # Stop all services
```

## 🔗 Quick Links

- **n8n UI**: http://localhost:5678
- **Glavito API**: http://localhost:3001
- **Admin Dashboard**: http://localhost:3000
- **API Documentation**: http://localhost:3001/api/docs

## 📚 Next Steps

1. **Explore Templates**: Check pre-built workflows in n8n
2. **Create Custom Workflows**: Use the visual editor
3. **Monitor Executions**: Watch workflows in action
4. **Read Full Guide**: See `N8N_INTEGRATION.md` for advanced features

## 🆘 Need Help?

**Common Issues:**
- **Can't access n8n**: Check `docker-compose ps n8n`
- **API errors**: Verify API key in `.env`
- **Workflow not triggering**: Check webhook URLs
- **Database errors**: Ensure PostgreSQL is running

**Get Support:**
- Check logs: `npm run n8n:logs`
- Test integration: `npm run n8n:test`
- Review documentation: `N8N_INTEGRATION.md`

---

**🎊 Congratulations! Your Glavito system now has powerful workflow automation capabilities!**