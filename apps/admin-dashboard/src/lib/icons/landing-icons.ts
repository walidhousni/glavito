/**
 * Landing page Icons8 integration
 * All icons are served via Icons8 CDN with proper sizing
 */

export interface Icon8Config {
  url: string;
  alt: string;
  size?: {
    desktop: number;
    mobile: number;
  };
}

// Industry Icons
export const industryIcons = {
  ecommerce: {
    url: 'https://img.icons8.com/3d-fluency/94/shopping-cart.png',
    alt: 'E-commerce',
    size: { desktop: 96, mobile: 64 },
  },
  automotive: {
    url: 'https://img.icons8.com/3d-fluency/94/car.png',
    alt: 'Automotive',
    size: { desktop: 96, mobile: 64 },
  },
  healthcare: {
    url: 'https://img.icons8.com/3d-fluency/94/hospital-3.png',
    alt: 'Healthcare',
    size: { desktop: 96, mobile: 64 },
  },
  realEstate: {
    url: 'https://img.icons8.com/3d-fluency/94/exterior.png',
    alt: 'Real Estate',
    size: { desktop: 96, mobile: 64 },
  },
  hospitality: {
    url: 'https://img.icons8.com/3d-fluency/94/hotel-bed.png',
    alt: 'Hospitality',
    size: { desktop: 96, mobile: 64 },
  },
} as const;

// Channel Icons
export const channelIcons = {
  whatsapp: {
    url: 'https://img.icons8.com/3d-fluency/94/whatsapp.png',
    alt: 'WhatsApp',
    size: { desktop: 80, mobile: 56 },
  },
  instagram: {
    url: 'https://img.icons8.com/3d-fluency/94/instagram-new.png',
    alt: 'Instagram',
    size: { desktop: 80, mobile: 56 },
  },
  email: {
    url: 'https://img.icons8.com/3d-fluency/94/email.png',
    alt: 'Email',
    size: { desktop: 80, mobile: 56 },
  },
  sms: {
    url: 'https://img.icons8.com/3d-fluency/94/sms.png',
    alt: 'SMS',
    size: { desktop: 80, mobile: 56 },
  },
  messenger: {
    url: 'https://img.icons8.com/3d-fluency/94/facebook-messenger.png',
    alt: 'Messenger',
    size: { desktop: 80, mobile: 56 },
  },
} as const;

// Integration Platform Icons
export const integrationIcons = {
  shopify: {
    url: 'https://img.icons8.com/color/96/shopify.png',
    alt: 'Shopify',
    size: { desktop: 72, mobile: 48 },
  },
  woocommerce: {
    url: 'https://img.icons8.com/color/96/woocommerce.png',
    alt: 'WooCommerce',
    size: { desktop: 72, mobile: 48 },
  },
  stripe: {
    url: 'https://img.icons8.com/color/96/stripe.png',
    alt: 'Stripe',
    size: { desktop: 72, mobile: 48 },
  },
  salesforce: {
    url: 'https://img.icons8.com/color/96/salesforce.png',
    alt: 'Salesforce',
    size: { desktop: 72, mobile: 48 },
  },
  hubspot: {
    url: 'https://img.icons8.com/color/96/hubspot.png',
    alt: 'HubSpot',
    size: { desktop: 72, mobile: 48 },
  },
  meta: {
    url: 'https://img.icons8.com/color/96/meta.png',
    alt: 'Meta Business',
    size: { desktop: 72, mobile: 48 },
  },
  twilio: {
    url: 'https://img.icons8.com/color/96/twilio.png',
    alt: 'Twilio',
    size: { desktop: 72, mobile: 48 },
  },
  bigcommerce: {
    url: 'https://img.icons8.com/color/96/big-commerce.png',
    alt: 'BigCommerce',
    size: { desktop: 72, mobile: 48 },
  },
  magento: {
    url: 'https://img.icons8.com/color/96/magento.png',
    alt: 'Magento',
    size: { desktop: 72, mobile: 48 },
  },
  zendesk: {
    url: 'https://img.icons8.com/color/96/zendesk.png',
    alt: 'Zendesk',
    size: { desktop: 72, mobile: 48 },
  },
  slack: {
    url: 'https://img.icons8.com/color/96/slack-new.png',
    alt: 'Slack',
    size: { desktop: 72, mobile: 48 },
  },
  zapier: {
    url: 'https://img.icons8.com/color/96/zapier.png',
    alt: 'Zapier',
    size: { desktop: 72, mobile: 48 },
  },
  mailchimp: {
    url: 'https://img.icons8.com/color/96/mailchimp.png',
    alt: 'Mailchimp',
    size: { desktop: 72, mobile: 48 },
  },
  wordpress: {
    url: 'https://img.icons8.com/color/96/wordpress.png',
    alt: 'WordPress',
    size: { desktop: 72, mobile: 48 },
  },
  squarespace: {
    url: 'https://img.icons8.com/color/96/squarespace.png',
    alt: 'Squarespace',
    size: { desktop: 72, mobile: 48 },
  },
} as const;

// Feature Icons
export const featureIcons = {
  automation: {
    url: 'https://img.icons8.com/3d-fluency/94/automation.png',
    alt: 'Automation',
    size: { desktop: 88, mobile: 60 },
  },
  analytics: {
    url: 'https://img.icons8.com/3d-fluency/94/bar-chart.png',
    alt: 'Analytics',
    size: { desktop: 88, mobile: 60 },
  },
  chatbot: {
    url: 'https://img.icons8.com/3d-fluency/94/bot.png',
    alt: 'AI Chatbot',
    size: { desktop: 88, mobile: 60 },
  },
  team: {
    url: 'https://img.icons8.com/3d-fluency/94/conference-call.png',
    alt: 'Team Collaboration',
    size: { desktop: 88, mobile: 60 },
  },
  notifications: {
    url: 'https://img.icons8.com/3d-fluency/94/appointment-reminders.png',
    alt: 'Notifications',
    size: { desktop: 88, mobile: 60 },
  },
  workflow: {
    url: 'https://img.icons8.com/3d-fluency/94/workflow.png',
    alt: 'Workflow',
    size: { desktop: 88, mobile: 60 },
  },
  support: {
    url: 'https://img.icons8.com/3d-fluency/94/customer-support.png',
    alt: 'Customer Support',
    size: { desktop: 88, mobile: 60 },
  },
  security: {
    url: 'https://img.icons8.com/3d-fluency/94/security-checked.png',
    alt: 'Security',
    size: { desktop: 88, mobile: 60 },
  },
  integration: {
    url: 'https://img.icons8.com/3d-fluency/94/data-transfer.png',
    alt: 'Integration',
    size: { desktop: 88, mobile: 60 },
  },
  multichannel: {
    url: 'https://img.icons8.com/3d-fluency/94/communication.png',
    alt: 'Multi-channel',
    size: { desktop: 88, mobile: 60 },
  },
} as const;

// Action Icons
export const actionIcons = {
  calendar: {
    url: 'https://img.icons8.com/3d-fluency/94/calendar.png',
    alt: 'Calendar',
    size: { desktop: 64, mobile: 48 },
  },
  document: {
    url: 'https://img.icons8.com/3d-fluency/94/document.png',
    alt: 'Document',
    size: { desktop: 64, mobile: 48 },
  },
  payment: {
    url: 'https://img.icons8.com/3d-fluency/94/bank-card-back-side.png',
    alt: 'Payment',
    size: { desktop: 64, mobile: 48 },
  },
  checkmark: {
    url: 'https://img.icons8.com/3d-fluency/94/checkmark.png',
    alt: 'Checkmark',
    size: { desktop: 48, mobile: 36 },
  },
  star: {
    url: 'https://img.icons8.com/3d-fluency/94/star.png',
    alt: 'Star',
    size: { desktop: 48, mobile: 36 },
  },
  rocket: {
    url: 'https://img.icons8.com/3d-fluency/94/rocket.png',
    alt: 'Rocket',
    size: { desktop: 64, mobile: 48 },
  },
  trophy: {
    url: 'https://img.icons8.com/3d-fluency/94/trophy.png',
    alt: 'Trophy',
    size: { desktop: 64, mobile: 48 },
  },
  lightning: {
    url: 'https://img.icons8.com/3d-fluency/94/lightning-bolt.png',
    alt: 'Lightning',
    size: { desktop: 64, mobile: 48 },
  },
} as const;

// Utility function to get responsive image props
export function getResponsiveIconProps(
  icon: Icon8Config,
  className?: string
): {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
} {
  const size = icon.size?.desktop || 96;
  return {
    src: icon.url,
    alt: icon.alt,
    width: size,
    height: size,
    className,
  };
}

