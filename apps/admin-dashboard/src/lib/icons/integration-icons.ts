// Integration provider icons using react-icons
// Using Simple Icons (si) for brand logos and Font Awesome (fa) for generic icons

import React from 'react';
import {
  SiSalesforce,
  SiHubspot,
  SiInstagram,
  SiWhatsapp,
  SiGmail,
  SiTwilio,
  SiShopify,
  SiWoo,
  SiFacebook,
  SiTiktok,
  SiMake,
  SiGooglesheets,
  SiSlack,
  SiZoom,
  SiGoogledrive,
  SiDropbox,
  SiAdobe,
  SiStripe,
  SiMailchimp,
  SiSendgrid,
  SiBigcommerce,
  SiZapier,
  SiZoho,
} from 'react-icons/si';
import { FaEnvelope, FaTruck, FaPuzzlePiece, FaMicrosoft } from 'react-icons/fa';

// Type for icon components
export type IntegrationIconComponent = React.ComponentType<{ className?: string; size?: number | string; color?: string }>;

// Integration provider icon components
export const integrationIcons: Record<string, IntegrationIconComponent> = {
  // CRM Integrations
  salesforce: SiSalesforce,
  hubspot: SiHubspot,
  dynamics: FaMicrosoft, // Using Microsoft icon as fallback
  marketo: SiAdobe, // Adobe/Marketo
  pardot: SiSalesforce, // Salesforce variant
  
  // Communication Channels
  whatsapp: SiWhatsapp,
  instagram: SiInstagram,
  gmail: SiGmail,
  email: FaEnvelope,
  twilio: SiTwilio,
  twilio_sms: SiTwilio,
  
  // E-commerce
  shopify: SiShopify,
  woocommerce: SiWoo,
  bigcommerce: SiBigcommerce,
  
  // Payments
  stripe: SiStripe,
  
  // Shipping & Logistics
  quick_livraison: FaTruck,
  
  // Marketing
  facebook_leads: SiFacebook,
  tiktok_forms: SiTiktok,
  mailchimp: SiMailchimp,
  sendgrid: SiSendgrid,
  make: SiMake,
  
  // Productivity
  google_sheets: SiGooglesheets,
  slack: SiSlack,
  teams: FaMicrosoft, // Using Microsoft icon as fallback
  zoom: SiZoom,
  zapier: SiZapier,
  zoho: SiZoho,
  
  // Storage
  google_drive: SiGoogledrive,
  dropbox: SiDropbox,
  onedrive: FaMicrosoft, // Using Microsoft icon as fallback
  
  // Fallback
  default: FaPuzzlePiece,
};

// Get icon component for a provider (with fallback)
export function getIntegrationIcon(provider: string): IntegrationIconComponent {
  return integrationIcons[provider] || integrationIcons.default;
}

// Get brand color for a provider
export function getIntegrationColor(provider: string): string {
  const colors: Record<string, string> = {
    // CRM Integrations
    salesforce: '#00A1E0',
    hubspot: '#FF7A59',
    dynamics: '#0078D4', // Microsoft blue
    marketo: '#FF0000', // Adobe red
    pardot: '#00A1E0', // Salesforce blue
    
    // Communication Channels
    whatsapp: '#25D366',
    instagram: '#E4405F',
    gmail: '#EA4335',
    email: '#6366F1', // Generic indigo
    twilio: '#F22F46',
    twilio_sms: '#F22F46',
    
    // E-commerce
    shopify: '#96BF48',
    woocommerce: '#96588A',
    bigcommerce: '#121212', // BigCommerce black
    
    // Payments
    stripe: '#635BFF',
    
    // Shipping & Logistics
    quick_livraison: '#F97316', // Orange
    
    // Marketing
    facebook_leads: '#1877F2',
    tiktok_forms: '#000000',
    mailchimp: '#FFE01B',
    sendgrid: '#1A82E2',
    make: '#000000', // Make.com black
    
    // Productivity
    google_sheets: '#34A853',
    slack: '#4A154B',
    teams: '#6264A7', // Microsoft Teams purple
    zoom: '#2D8CFF',
    zapier: '#FF4A00',
    zoho: '#E4252D',
    
    // Storage
    google_drive: '#4285F4',
    dropbox: '#0061FF',
    onedrive: '#0078D4', // Microsoft blue
  };

  return colors[provider] || '#6B7280'; // Default gray
}

// Get colored badge color for category
export function getCategoryColor(category: string): { bg: string; text: string; border: string } {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    communication: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      text: 'text-blue-700 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800',
    },
    crm: {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      text: 'text-purple-700 dark:text-purple-300',
      border: 'border-purple-200 dark:border-purple-800',
    },
    ecommerce: {
      bg: 'bg-green-50 dark:bg-green-950/30',
      text: 'text-green-700 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
    },
    shipping: {
      bg: 'bg-orange-50 dark:bg-orange-950/30',
      text: 'text-orange-700 dark:text-orange-300',
      border: 'border-orange-200 dark:border-orange-800',
    },
    marketing: {
      bg: 'bg-pink-50 dark:bg-pink-950/30',
      text: 'text-pink-700 dark:text-pink-300',
      border: 'border-pink-200 dark:border-pink-800',
    },
    productivity: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
      text: 'text-indigo-700 dark:text-indigo-300',
      border: 'border-indigo-200 dark:border-indigo-800',
    },
    automation: {
      bg: 'bg-cyan-50 dark:bg-cyan-950/30',
      text: 'text-cyan-700 dark:text-cyan-300',
      border: 'border-cyan-200 dark:border-cyan-800',
    },
  };

  return colors[category] || {
    bg: 'bg-gray-50 dark:bg-gray-950/30',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-200 dark:border-gray-800',
  };
}
