/* eslint-disable @typescript-eslint/no-explicit-any */

export const PromptTemplates = {
  intentClassification: (
    input: { content: string; previousMessages?: string[]; locale?: string }
  ) => `You are an AI assistant for customer service operating in ${input.locale || 'en'}.
Classify the customer's primary intent and confidence.

Message: "${input.content}"
${input.previousMessages?.length ? `Previous: ${input.previousMessages.join(' | ')}` : ''}

Return strict JSON with keys: primaryIntent (snake_case), confidence (0..1), secondaryIntents (array), category, subcategory.
` ,

  responseSuggestions: (
    input: { content: string; toneHints?: string[]; contextNote?: string }
  ) => `You are a helpful support agent. Generate three short, send-ready replies.
Customer: "${input.content}"
${input.contextNote ? `Context: ${input.contextNote}` : ''}
Tones: professional, friendly, empathetic${input.toneHints?.length ? `, plus: ${input.toneHints.join(', ')}` : ''}.
Avoid placeholders; be concise; do not include greetings if redundant.

Return strict JSON { "suggestedResponses": [{"response":"...","tone":"...","confidence":0.0,"reasoning":"..."}], "templates": [] }.
`,

  threadSummary: (
    input: { messages: Array<{ role: string; text: string }>; maxBullets?: number }
  ) => `Summarize the following conversation for a support agent.
Return STRICT JSON with:
{ "short": "one-sentence summary (<= 180 chars)", "bullets": ["key point 1","key point 2","next step"] }
Messages:
${input.messages.map(m => `- ${m.role}: ${m.text}`).join('\n')}
Max bullets: ${Math.max(3, Math.min(8, input.maxBullets ?? 5))}
`,

  rewriteTone: (
    input: { content: string; tone?: string; format?: 'paragraph' | 'bullets' | 'email' | 'whatsapp' }
  ) => `Rewrite the message with the requested tone and format while preserving meaning.
Tone: ${input.tone || 'professional'}
Format: ${input.format || 'paragraph'}
Message: """${input.content}"""

Return STRICT JSON: { "text": "rewritten text" }`,

  grammarFix: (
    input: { content: string; language?: string }
  ) => `Fix grammar and clarity without changing the meaning.
Language: ${input.language || 'en'}
Text: """${input.content}"""

Return STRICT JSON: { "text": "corrected text" }`,
};

export type PromptTemplateName = keyof typeof PromptTemplates;

export function buildPrompt<T extends PromptTemplateName>(name: T, args: Parameters<typeof PromptTemplates[T]>[0]): string {
  const tmpl = PromptTemplates[name] as any;
  return tmpl(args);
}


