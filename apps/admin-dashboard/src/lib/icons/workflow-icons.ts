// Icons8 URLs for workflow nodes (96px versions from Icons8 API)
export const workflowNodeIcons = {
  // Triggers
  trigger: 'https://img.icons8.com/?id=15366&format=png&size=96', // Lightning Bolt (Color)
  webhook: 'https://img.icons8.com/?id=60671&format=png&size=96', // Webhook
  schedule: 'https://img.icons8.com/?id=85037&format=png&size=96', // Clock/Timer
  event: 'https://img.icons8.com/?id=15366&format=png&size=96', // Lightning
  
  // Ticket Actions
  ticket_create: 'https://img.icons8.com/?id=103187&format=png&size=96', // Create New
  ticket_update: 'https://img.icons8.com/?id=82751&format=png&size=96', // Edit
  ticket_assign: 'https://img.icons8.com/?id=23454&format=png&size=96', // Conference Call/Assign
  ticket_close: 'https://img.icons8.com/?id=98374&format=png&size=96', // Checkmark
  
  // Messaging
  send_message: 'https://img.icons8.com/?id=YZPI5ITFKVFg&format=png&size=96', // Chat Message
  template_message: 'https://img.icons8.com/?id=111374&format=png&size=96', // Template
  send_email: 'https://img.icons8.com/?id=86171&format=png&size=96', // Email
  send_whatsapp: 'https://img.icons8.com/?id=16713&format=png&size=96', // WhatsApp
  send_instagram: 'https://img.icons8.com/?id=32323&format=png&size=96', // Instagram
  
  // Logic & Flow Control
  condition: 'https://img.icons8.com/?id=86554&format=png&size=96', // Decision/Branch
  switch: 'https://img.icons8.com/?id=38075&format=png&size=96', // Switch
  delay: 'https://img.icons8.com/?id=85037&format=png&size=96', // Stopwatch/Clock
  wait: 'https://img.icons8.com/?id=85037&format=png&size=96', // Hourglass
  set_variable: 'https://img.icons8.com/?id=102518&format=png&size=96', // Variable/Code
  
  // AI & Intelligence
  ai_decision: 'https://img.icons8.com/?id=93407&format=png&size=96', // AI/Brain
  ai_analysis: 'https://img.icons8.com/?id=lTAEpm1VusIn&format=png&size=96', // AI Analysis
  ai_agent: 'https://img.icons8.com/?id=V0XfZ8Eo5U3b&format=png&size=96', // Robot/Agent
  ai_route: 'https://img.icons8.com/?id=63772&format=png&size=96', // Route/Path
  ai_tool_call: 'https://img.icons8.com/?id=102518&format=png&size=96', // Tools/Code
  ai_guardrail: 'https://img.icons8.com/?id=61019&format=png&size=96', // Shield/Guard
  sentiment_analysis: 'https://img.icons8.com/?id=103133&format=png&size=96', // Emoji/Sentiment
  intent_detection: 'https://img.icons8.com/?id=120342&format=png&size=96', // Mind Map
  
  // Customer Intelligence
  segment_check: 'https://img.icons8.com/?id=23267&format=png&size=96', // User Group
  customer_segment: 'https://img.icons8.com/?id=23267&format=png&size=96', // People
  journey_tracker: 'https://img.icons8.com/?id=63772&format=png&size=96', // Route/Path
  churn_risk: 'https://img.icons8.com/?id=61019&format=png&size=96', // Warning Shield
  
  // Analytics & Tracking
  track_event: 'https://img.icons8.com/?id=90403&format=png&size=96', // Statistics
  analytics_event: 'https://img.icons8.com/?id=90403&format=png&size=96', // Graph
  log_metric: 'https://img.icons8.com/?id=11254&format=png&size=96', // Bar Chart
  
  // Integrations
  http_request: 'https://img.icons8.com/?id=85038&format=png&size=96', // API/Link
  api_call: 'https://img.icons8.com/?id=85038&format=png&size=96', // API Settings
  database: 'https://img.icons8.com/?id=pGQDsGM4NfGx&format=png&size=96', // Database
  
  // Utilities
  notification: 'https://img.icons8.com/?id=87327&format=png&size=96', // Bell
  
  // Flow Control
  start: 'https://img.icons8.com/?id=82737&format=png&size=96', // Play
  end: 'https://img.icons8.com/?id=83167&format=png&size=96', // Stop
  input: 'https://img.icons8.com/?id=82737&format=png&size=96', // Play/Input
  output: 'https://img.icons8.com/?id=83167&format=png&size=96', // Flag/Output
  channel_in: 'https://img.icons8.com/?id=99697&format=png&size=96', // Inbox
  
  // Default fallback
  default: 'https://img.icons8.com/?id=12817&format=png&size=96', // Workflow
};

export function getWorkflowNodeIcon(type?: string): string {
  const normalizedType = typeof type === 'string'
    ? type.toLowerCase().replace(/[-_]/g, '_')
    : 'default';
  return workflowNodeIcons[normalizedType as keyof typeof workflowNodeIcons] || workflowNodeIcons.default;
}

export function getNodeCategoryColor(type?: string): string {
  const normalizedType = typeof type === 'string' ? type.toLowerCase() : '';
  
  if (normalizedType.includes('trigger') || normalizedType.includes('webhook') || normalizedType.includes('schedule') || normalizedType.includes('event')) {
    return 'from-purple-500 to-purple-600';
  }
  if (normalizedType.includes('ticket')) {
    return 'from-blue-500 to-blue-600';
  }
  if (normalizedType.includes('message') || normalizedType.includes('email') || normalizedType.includes('whatsapp') || normalizedType.includes('instagram') || normalizedType.includes('send')) {
    return 'from-green-500 to-green-600';
  }
  if (normalizedType.includes('condition') || normalizedType.includes('switch') || normalizedType.includes('delay') || normalizedType.includes('wait') || normalizedType.includes('variable')) {
    return 'from-yellow-500 to-yellow-600';
  }
  if (normalizedType.includes('ai') || normalizedType.includes('sentiment') || normalizedType.includes('intent')) {
    return 'from-pink-500 to-pink-600';
  }
  if (normalizedType.includes('segment') || normalizedType.includes('journey') || normalizedType.includes('churn') || normalizedType.includes('customer')) {
    return 'from-indigo-500 to-indigo-600';
  }
  if (normalizedType.includes('analytics') || normalizedType.includes('track') || normalizedType.includes('metric') || normalizedType.includes('log')) {
    return 'from-orange-500 to-orange-600';
  }
  if (normalizedType.includes('api') || normalizedType.includes('http') || normalizedType.includes('database')) {
    return 'from-teal-500 to-teal-600';
  }
  if (normalizedType.includes('input') || normalizedType.includes('start')) {
    return 'from-emerald-500 to-emerald-600';
  }
  if (normalizedType.includes('output') || normalizedType.includes('end')) {
    return 'from-red-500 to-red-600';
  }
  
  return 'from-slate-500 to-slate-600';
}

export function getNodeStatusColor(status?: string): string {
  switch (status) {
    case 'active':
    case 'success':
    case 'completed':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
    case 'running':
    case 'in_progress':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'error':
    case 'failed':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'warning':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'inactive':
    case 'disabled':
    case 'draft':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400';
    default:
      return 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400';
  }
}

// Get gradient class for node backgrounds
export function getNodeGradient(type?: string): string {
  return `bg-gradient-to-br ${getNodeCategoryColor(type)} shadow-lg`;
}

// Get ring color for selected nodes
export function getNodeRingColor(type?: string): string {
  const normalizedType = typeof type === 'string' ? type.toLowerCase() : '';
  
  if (normalizedType.includes('trigger') || normalizedType.includes('webhook')) return 'ring-purple-500/50';
  if (normalizedType.includes('ticket')) return 'ring-blue-500/50';
  if (normalizedType.includes('message') || normalizedType.includes('send')) return 'ring-green-500/50';
  if (normalizedType.includes('condition') || normalizedType.includes('switch')) return 'ring-yellow-500/50';
  if (normalizedType.includes('ai')) return 'ring-pink-500/50';
  if (normalizedType.includes('segment') || normalizedType.includes('customer')) return 'ring-indigo-500/50';
  if (normalizedType.includes('analytics') || normalizedType.includes('track')) return 'ring-orange-500/50';
  if (normalizedType.includes('api') || normalizedType.includes('http')) return 'ring-teal-500/50';
  
  return 'ring-slate-500/50';
}
