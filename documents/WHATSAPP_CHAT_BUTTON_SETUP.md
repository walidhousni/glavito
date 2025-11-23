# WhatsApp Chat Button Setup Guide

## Overview
We've added a floating WhatsApp chat button to the Glavito homepage, similar to SleekFlow's implementation. This button allows visitors to instantly start a WhatsApp conversation with your business.

## Features ✨

### Visual Design
- **Floating Button**: Fixed position at bottom-right corner
- **WhatsApp Green**: Uses official WhatsApp brand color (#25D366)
- **Animations**: 
  - Pulse animation to draw attention
  - Hover shake effect
  - Smooth scale transitions
- **Notification Badge**: Red badge showing "1" to indicate availability
- **Welcome Tooltip**: Dismissible message bubble explaining the feature

### User Experience
- **Pre-filled Message**: Automatically includes page URL and greeting
- **Mobile Optimized**: Opens WhatsApp app on mobile devices
- **Desktop Compatible**: Opens WhatsApp Web on desktop browsers
- **Smooth Animations**: Professional framer-motion animations
- **Accessible**: Proper ARIA labels and semantic HTML

## Setup Instructions

### 1. Configure WhatsApp Business Number

Add your WhatsApp Business phone number to your environment variables:

```bash
# .env.local or .env
NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE=1234567890
```

**Format**: Include country code without '+' or spaces
- ✅ Correct: `85264522442` (Hong Kong)
- ✅ Correct: `14155238886` (USA)
- ❌ Incorrect: `+852 6452 2442`
- ❌ Incorrect: `(415) 523-8886`

### 2. Customize the Message

The default message includes:
- A greeting: "Hi Glavito!"
- The current page URL
- A call to action: "May I know more?"

To customize, edit the `message` prop in `apps/admin-dashboard/src/app/[locale]/page.tsx`:

```tsx
<WhatsAppChatButton 
  phoneNumber={process.env.NEXT_PUBLIC_WHATSAPP_BUSINESS_PHONE || '1234567890'}
  message="Your custom message here!"
/>
```

### 3. Translation Keys

Add these translation keys to your localization files:

**en.json**:
```json
{
  "landing": {
    "whatsapp": {
      "greeting": "Chat with us!",
      "prompt": "Have questions? We're here to help via WhatsApp!"
    }
  }
}
```

**fr.json**:
```json
{
  "landing": {
    "whatsapp": {
      "greeting": "Chattez avec nous !",
      "prompt": "Des questions ? Nous sommes là pour vous aider via WhatsApp !"
    }
  }
}
```

### 4. Position Customization

To change the button position, modify the `position` prop:

```tsx
<WhatsAppChatButton 
  phoneNumber="..."
  message="..."
  position="bottom-left"  // or "bottom-right"
/>
```

### 5. Hide the Tooltip

To start without the welcome tooltip, modify the component's default state:

```tsx
// In whatsapp-chat-button.tsx
const [showTooltip, setShowTooltip] = useState(false); // Change true to false
```

## Component API

### WhatsAppChatButton Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `phoneNumber` | string | Yes | - | WhatsApp Business phone number with country code |
| `message` | string | No | Auto-generated | Pre-filled message text |
| `position` | 'bottom-right' \| 'bottom-left' | No | 'bottom-right' | Button position |

## How It Works

### WhatsApp API URL Format
```
https://api.whatsapp.com/send?phone={PHONE_NUMBER}&text={ENCODED_MESSAGE}
```

**Example**:
```
https://api.whatsapp.com/send?phone=85264522442&text=Hi%20Glavito!%20I%20just%20visited%20https://glavito.com.%20May%20I%20know%20more?
```

### Behavior
1. **Mobile Devices**: Opens WhatsApp mobile app if installed, otherwise opens WhatsApp Web
2. **Desktop**: Opens WhatsApp Web in a new tab
3. **Pre-filled**: Message is automatically filled in the chat input
4. **User Control**: User can edit the message before sending

## Technical Details

### Files Created/Modified

**New File**:
- `apps/admin-dashboard/src/components/landing/whatsapp-chat-button.tsx`

**Modified Files**:
- `apps/admin-dashboard/src/components/landing/index.ts` (added export)
- `apps/admin-dashboard/src/app/[locale]/page.tsx` (added button to homepage)

### Dependencies Used
- `framer-motion`: For animations
- `lucide-react`: For icons (MessageCircle, X)
- `next-intl`: For translations

### Styling
- Tailwind CSS for styling
- WhatsApp official brand color: `#25D366`
- Responsive design with mobile-first approach
- Dark mode support

## Best Practices

### 1. Phone Number Management
- Store in environment variables (never hardcode)
- Use different numbers for development/production
- Verify number is WhatsApp Business enabled

### 2. Message Content
- Keep messages short and friendly
- Include context (page URL, product interest, etc.)
- Make it easy for agents to understand the source
- Respect user privacy (don't include sensitive data)

### 3. Performance
- Button loads after main content (1s delay)
- Lazy-loads animations
- No external API calls required

### 4. Analytics (Optional)
To track button clicks, add an onClick handler:

```tsx
<motion.a
  href={whatsappUrl}
  target="_blank"
  rel="noopener noreferrer"
  onClick={() => {
    // Track event
    gtag?.('event', 'whatsapp_chat_click', {
      page_url: window.location.href,
      button_position: position,
    });
  }}
>
```

## Testing Checklist

- [ ] Button appears on homepage after 1 second
- [ ] Pulse animation is visible
- [ ] Hover effect triggers shake animation
- [ ] Tooltip is dismissible
- [ ] Click opens WhatsApp with pre-filled message
- [ ] Works on mobile devices (opens app)
- [ ] Works on desktop (opens WhatsApp Web)
- [ ] Message includes correct page URL
- [ ] Phone number is correctly formatted
- [ ] Translations load properly
- [ ] Dark mode displays correctly
- [ ] Button doesn't interfere with other content

## Troubleshooting

### Button Not Appearing
- Check that `WhatsAppChatButton` is imported and added to page
- Verify environment variable is set
- Check browser console for errors

### WhatsApp Not Opening
- Verify phone number format (no spaces, +, or special characters)
- Test the URL manually in browser
- Ensure WhatsApp/WhatsApp Web is accessible in user's region

### Tooltip Not Dismissing
- Check that `showTooltip` state is being updated
- Verify X button has proper onClick handler

### Styling Issues
- Ensure Tailwind CSS is properly configured
- Check for conflicting z-index values
- Verify Framer Motion is installed and working

## Future Enhancements

Potential improvements:
1. **Business Hours**: Hide button outside business hours
2. **Queue Status**: Show estimated response time
3. **Multi-Agent**: Route to different numbers based on page/product
4. **Chat History**: Remember if user already chatted (use localStorage)
5. **Offline Mode**: Show "We're offline, leave a message" tooltip
6. **A/B Testing**: Test different messages and positions
7. **Analytics Dashboard**: Track conversion rates
8. **Custom Avatar**: Show agent photo instead of icon
9. **Sound Effect**: Optional notification sound on load
10. **Chatbot Preview**: Show sample conversation before redirect

## Comparison with SleekFlow

Our implementation matches SleekFlow's design:

| Feature | SleekFlow | Glavito | Status |
|---------|-----------|---------|--------|
| Floating Button | ✅ | ✅ | ✅ |
| WhatsApp Green | ✅ | ✅ | ✅ |
| Pulse Animation | ✅ | ✅ | ✅ |
| Welcome Tooltip | ✅ | ✅ | ✅ |
| Pre-filled Message | ✅ | ✅ | ✅ |
| Mobile Optimized | ✅ | ✅ | ✅ |
| Notification Badge | ✅ | ✅ | ✅ |
| Hover Effects | ✅ | ✅ | ✅ |

## Support

For issues or questions:
- Check this documentation
- Review component props and API
- Test with different phone numbers
- Verify WhatsApp API availability in your region

