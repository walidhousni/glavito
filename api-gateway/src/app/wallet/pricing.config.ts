/**
 * Pricing configuration for different message types and channels
 * Costs are in USD per message
 */
export interface ChannelPricing {
  // Base message costs
  text: number;
  image: number;
  video: number;
  audio: number;
  document: number;
  location: number;
  contact: number;
  template: number;
  
  // Channel-specific costs
  mms?: number; // For SMS channel
  carrierFee?: number; // Carrier fees (e.g., Twilio)
  
  // Delivery status modifiers
  deliveredMultiplier?: number; // Cost multiplier when delivered (default: 1.0)
  failedRefund?: number; // Refund percentage for failed messages (default: 0.0)
}

// AI Token Pricing Configuration
export const AI_TOKEN_PRICING: Record<string, number> = {
  // Base costs per operation type (in tokens)
  ai_analysis: 10, // Base cost for AI analysis
  auto_resolve: 15, // Auto-resolve is more expensive (includes analysis + response generation)
  insights: 5, // Insights are cheaper (aggregated data)
  coaching: 20, // Sales coaching is expensive (detailed analysis)
  triage: 8, // Triage analysis
  sentiment_analysis: 3,
  intent_classification: 3,
  response_generation: 12,
  knowledge_suggestions: 5,
  escalation_prediction: 5,
  satisfaction_prediction: 4,
  churn_risk_assessment: 6,
  language_detection: 2,
  entity_extraction: 4,
};

// Calculate token cost based on content length and operation type
export function calculateAITokenCost(
  operationType: string,
  contentLength: number,
  analysisTypes?: string[],
): number {
  const baseCost = AI_TOKEN_PRICING[operationType] || AI_TOKEN_PRICING.ai_analysis;
  
  // Add cost based on content length (1 token per 100 characters, minimum 1)
  const lengthCost = Math.max(1, Math.floor(contentLength / 100));
  
  // If multiple analysis types, add cost for each
  const analysisCost = analysisTypes && analysisTypes.length > 1
    ? analysisTypes.reduce((sum, type) => {
        const typeCost = AI_TOKEN_PRICING[type] || 0;
        return sum + (typeCost * 0.5); // 50% of base cost for additional types
      }, 0)
    : 0;
  
  return Math.ceil(baseCost + lengthCost + analysisCost);
}

export const CHANNEL_PRICING: Record<string, ChannelPricing> = {
  whatsapp: {
    text: 0.005, // $0.005 per text message (conversation pricing)
    image: 0.01, // $0.01 per image
    video: 0.015, // $0.015 per video
    audio: 0.01, // $0.01 per audio
    document: 0.01, // $0.01 per document
    location: 0.005,
    contact: 0.005,
    template: 0.005, // Template messages same as text
    deliveredMultiplier: 1.0, // Only charge when delivered
    failedRefund: 1.0, // Full refund for failed messages
  },
  instagram: {
    text: 0.0, // Instagram DMs are free (within 24h window)
    image: 0.0,
    video: 0.0,
    audio: 0.0,
    document: 0.0,
    location: 0.0,
    contact: 0.0,
    template: 0.0,
    deliveredMultiplier: 1.0,
    failedRefund: 0.0,
  },
  sms: {
    text: 0.0075, // $0.0075 per SMS
    image: 0.02, // MMS pricing
    video: 0.02,
    audio: 0.02,
    document: 0.02,
    location: 0.0075,
    contact: 0.0075,
    template: 0.0075, // Template SMS same as text
    mms: 0.02, // MMS cost
    carrierFee: 0.001, // Carrier fee per message
    deliveredMultiplier: 1.0,
    failedRefund: 0.5, // 50% refund for failed SMS
  },
  email: {
    text: 0.0, // Email is typically free or based on plan
    image: 0.0,
    video: 0.0,
    audio: 0.0,
    document: 0.0,
    location: 0.0,
    contact: 0.0,
    template: 0.0,
    deliveredMultiplier: 1.0,
    failedRefund: 0.0,
  },
};

/**
 * Calculate cost for a message based on type and channel
 */
export function calculateMessageCost(
  channelType: string,
  messageType: string,
  hasAttachments: boolean = false,
): number {
  const pricing = CHANNEL_PRICING[channelType.toLowerCase()];
  if (!pricing) {
    return 0; // Unknown channel, no cost
  }

  // For SMS with attachments, use MMS pricing
  if (channelType.toLowerCase() === 'sms' && hasAttachments && pricing.mms) {
    return pricing.mms + (pricing.carrierFee || 0);
  }

  // Get base cost for message type
  const baseCost = pricing[messageType.toLowerCase() as keyof ChannelPricing] as number || pricing.text;
  
  // Add carrier fee for SMS
  const carrierFee = channelType.toLowerCase() === 'sms' ? (pricing.carrierFee || 0) : 0;
  
  return baseCost + carrierFee;
}

/**
 * Calculate refund for failed message
 */
export function calculateRefund(
  channelType: string,
  originalCost: number,
): number {
  const pricing = CHANNEL_PRICING[channelType.toLowerCase()];
  if (!pricing || !pricing.failedRefund) {
    return 0;
  }
  
  return originalCost * pricing.failedRefund;
}

