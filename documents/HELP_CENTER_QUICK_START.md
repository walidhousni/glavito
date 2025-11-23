# Multi-Channel Help Center - Quick Start Guide 🚀

## Getting Started

### 1. Access the Help Center

Navigate to your help center at:
```
https://your-domain.glavito.com/help-center
```

Or for local development:
```
http://localhost:3000/help-center
```

### 2. Using the Chat Widget

#### Opening the Chat
- Click the **blue chat bubble** in the bottom-right corner
- The chat widget will expand

#### Sending Messages
1. Type your message in the input field
2. Press **Enter** or click the **Send button**
3. AI assistant will respond automatically
4. Your message history is saved automatically

### 3. Linking Channels

#### Link WhatsApp
1. Open the chat widget
2. Click **"Add Channel"** in the channel selector
3. Select **WhatsApp**
4. Enter your phone number (with country code: +1 555 123 4567)
5. Click **"Continue"**
6. You'll receive a **6-digit verification code** via WhatsApp
7. Enter the code in the modal
8. Click **"Verify"**
9. 🎉 Success! Your WhatsApp is now linked

**What happens next:**
- All assistant messages will be sent to your WhatsApp
- Messages you send from WhatsApp will appear in the web chat (once webhook handler is set up)
- You can continue the conversation on either platform

#### Link Instagram
1. Open the chat widget
2. Click **"Add Channel"** in the channel selector
3. Select **Instagram**
4. Enter your Instagram handle (@username)
5. Click **"Continue"**
6. You'll receive a **6-digit verification code** via Instagram DM
7. Enter the code in the modal
8. Click **"Verify"**
9. 🎉 Success! Your Instagram is now linked

#### Link Email
1. Open the chat widget
2. Click **"Add Channel"** in the channel selector
3. Select **Email**
4. Enter your email address
5. Click **"Continue"**
6. ✅ Email linked instantly (no verification needed)

### 4. Using Multiple Channels

Once you've linked multiple channels:

1. **View Active Channels**
   - Look at the channel selector bar in the chat widget
   - Connected channels have a **green dot** indicator

2. **Switch Channels**
   - Click on any connected channel badge
   - The active channel is highlighted with a colored background

3. **Send to All Channels**
   - By default, assistant messages go to **all linked channels**
   - You'll see channel indicators on each message

4. **Check Channel Status**
   - Your session automatically saves which channels are linked
   - Refresh the page and your channels remain connected
   - Session stored in browser localStorage

### 5. Searching the Knowledge Base

#### Using the Search Bar
1. Type your query in the **large search bar** at the top
2. Results appear automatically as you type (300ms debounce)
3. Click on any article or FAQ to view details

#### Browse by Category
- Scroll down to see **category cards**:
  - 📘 Getting Started
  - 🔌 Integrations
  - 👥 Team Management
  - 📊 Analytics
- Click any category to browse its articles

#### Popular Articles
- View the **"Popular Articles"** section
- Articles show view counts and helpful ratings
- Click to read the full article

### 6. Session Continuity

#### Session Persistence
Your chat session is automatically saved in your browser:
- **Message history** preserved across page refreshes
- **Linked channels** remain connected
- **Search history** remembered

#### Resume a Session
If you return later:
1. The page will auto-restore your last session
2. Your channel connections remain active
3. Your message history loads automatically

#### Start Fresh
To start a new session:
1. Open browser DevTools (F12)
2. Go to **Application > Local Storage**
3. Delete `helpcenter_session`
4. Refresh the page

### 7. Troubleshooting

#### Verification Code Not Received

**WhatsApp:**
- Check your phone number format (+1 555 123 4567)
- Ensure you can receive WhatsApp messages
- Click **"Resend"** to request a new code
- Wait 1 minute between requests (rate limited)

**Instagram:**
- Check your Instagram handle (@username)
- Ensure your DMs are open (not restricted)
- Click **"Resend"** to request a new code
- Wait 1 minute between requests (rate limited)

#### Invalid Verification Code
- Codes are **6 digits only**
- Codes expire after **10 minutes**
- You have **3 attempts** before needing to request a new code
- Double-check you entered the code correctly

#### Channel Shows as "Disconnected"
1. Refresh the page
2. Check your internet connection
3. Try unlinking and relinking the channel
4. Contact support if issue persists

#### Messages Not Sending
- Check your internet connection
- Look for the message status icon:
  - ⏱️ Sending
  - ✓ Sent
  - ✓✓ Delivered
  - ✓✓ (blue) Read
  - ⚠️ Failed
- If failed, try resending

#### Chat Widget Not Opening
- Clear browser cache
- Disable browser extensions
- Try a different browser
- Check browser console for errors (F12)

### 8. Best Practices

#### For Best Experience
1. **Link your preferred channel** first (WhatsApp or Instagram)
2. **Keep the web chat open** for instant responses
3. **Search the knowledge base** before asking questions
4. **Use specific keywords** when searching
5. **Provide context** in your messages

#### For Fastest Response
1. Use **WhatsApp** for immediate notifications
2. Use **Email** for detailed, non-urgent inquiries
3. Use **Web chat** for quick back-and-forth
4. Use **Instagram** if you're already active there

#### Channel Recommendations
- **WhatsApp**: Best for urgent issues, rich media (images, voice notes)
- **Instagram**: Best for casual conversation, brand interaction
- **Email**: Best for formal requests, detailed explanations
- **Web Chat**: Best for quick questions, browsing knowledge base

### 9. Features Overview

#### What You Can Do Now ✅
- Send and receive messages in web chat
- Link WhatsApp, Instagram, and Email
- Verify channels with codes
- Switch between channels
- Broadcast messages to all channels
- Search knowledge base articles
- Browse FAQ categories
- View popular articles
- Auto-save session history
- Dark mode support
- Mobile responsive design

#### Coming Soon 🔜
- Receive WhatsApp messages in web chat
- Receive Instagram messages in web chat
- File attachments (images, documents)
- Voice notes support
- Quick reply buttons
- Session history viewer
- Print/export chat transcript
- More article categories
- Video tutorials
- Live agent handoff

### 10. Admin Configuration

#### For Administrators

**Setting Up WhatsApp Business API:**
1. Create a WhatsApp Business Account
2. Get your access token and phone number ID
3. Add to `.env`:
   ```bash
   WHATSAPP_ACCESS_TOKEN=your_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_id
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=random_string
   ```
4. Configure webhook URL in Meta Dashboard

**Setting Up Instagram Business API:**
1. Connect Instagram Business Account to Facebook Page
2. Get your access token and page ID
3. Add to `.env`:
   ```bash
   INSTAGRAM_ACCESS_TOKEN=your_token
   INSTAGRAM_PAGE_ID=your_page_id
   INSTAGRAM_VERIFY_TOKEN=random_string
   ```
4. Configure webhook URL in Meta Dashboard

**Webhook URLs:**
- WhatsApp: `https://your-domain.com/api/webhooks/whatsapp`
- Instagram: `https://your-domain.com/api/webhooks/instagram`

### 11. Keyboard Shortcuts

- **Enter**: Send message
- **Shift + Enter**: New line in message
- **Esc**: Close chat widget
- **Ctrl/Cmd + K**: Focus search bar

### 12. Mobile Experience

#### On Mobile Devices
- Chat widget automatically adjusts to screen size
- Touch-optimized buttons and inputs
- Swipe to close chat (coming soon)
- Full-screen modal for channel connection
- Native keyboard support
- Copy/paste verification codes

#### Tips for Mobile
- Tap the verification code in WhatsApp/Instagram to auto-copy
- Use portrait mode for best experience
- Enable notifications for new messages
- Bookmark the help center for quick access

---

## Need Help?

If you're stuck or have questions:

1. **Search the knowledge base** using the search bar
2. **Browse FAQ categories** for common questions
3. **Link WhatsApp** for instant support (fastest)
4. **Send us an email** for detailed support
5. **Contact support** at support@example.com

---

## Feedback

We'd love to hear from you!

- **Found a bug?** Report it via the chat
- **Have a suggestion?** Share it with us
- **Love the new features?** Leave a rating

Thank you for using our multi-channel help center! 🎉

