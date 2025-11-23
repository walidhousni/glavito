import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';

interface RoutingContext {
  tenantId: string;
  customerId?: string;
  teamId?: string;
  priority?: string;
  requiredSkills?: string[];
  // Optional context used for intelligent routing
  subject?: string;
  description?: string;
  channelType?: string; // email | whatsapp | instagram | web | phone
  languageHint?: string; // pre-detected language (e.g., from UI)
}

interface AgentCandidate {
  id: string;
  agentProfile?: {
    maxConcurrentTickets: number | null;
    skills: string[] | null;
  } | null;
  teamMemberships?: Array<{ teamId: string }>;
  assignedTickets?: Array<{ id: string }>;
}

@Injectable()
export class TicketsRoutingService {
  private readonly logger = new Logger(TicketsRoutingService.name);

  constructor(
    private readonly database: DatabaseService,
    @Optional() @Inject('AI_INTELLIGENCE_SERVICE') private readonly ai?: { analyzeContent: (args: any) => Promise<any> },
  ) {}

  async suggestAgent(context: RoutingContext): Promise<string | null> {
    try {
      const { tenantId, teamId, requiredSkills = [], customerId } = context;
      const content = `${context.subject || ''} ${context.description || ''}`.trim();

      // 0) AI-derived routing signals (best-effort)
      const aiSignals = await this.getAISignalsSafe({
        tenantId,
        content,
        channelType: context.channelType,
        languageHint: context.languageHint,
      });
      const detectedLanguage = aiSignals?.language || context.languageHint || undefined;
      const inferredSkills = aiSignals?.inferredSkills || [];
      const urgencyLevel = aiSignals?.urgencyLevel || 'medium';
      const mergedSkills = Array.from(new Set([...(requiredSkills || []), ...inferredSkills]));

      // VIP boost if customer is VIP (from advanced profile)
      let isVip = false;
      if (customerId) {
        try {
          const advDb = this.database as unknown as {
            customerAdvanced?: {
              findUnique: (args: { where: { id: string } }) => Promise<{ isVip?: boolean } | null>;
            };
          };
          const customer = await advDb.customerAdvanced?.findUnique({
            where: { id: customerId },
          });
          isVip = !!customer?.isVip;
        } catch (err) {
          this.logger.debug(`VIP check failed for customer ${customerId}: ${String(err)}`);
        }
      }

      // 1) Load all active, auto-assign enabled agent profiles for this tenant
      const agents = (await this.database.user.findMany({
        where: {
          tenantId,
          agentProfile: {
            is: {
              autoAssign: true,
            },
            isNot: null,
          },
          status: 'active',
        },
        select: {
          id: true,
          agentProfile: {
            select: {
              maxConcurrentTickets: true,
              skills: true,
              languages: true,
            },
          },
          teamMemberships: {
            select: { teamId: true },
          },
          assignedTickets: {
            where: { status: { in: ['open', 'pending', 'in_progress', 'waiting'] } },
            select: { id: true },
          },
        },
      })) as unknown as AgentCandidate[];

      if (!agents.length) {
        this.logger.debug(`No eligible agents found for tenant ${tenantId}`);
        return null;
      }

      // 2) Score candidates using capacity, skills, language, team alignment, and urgency/VIP modifiers
      const weights = this.getWeights({ urgencyLevel, isVip });
      const now = Date.now();

      const scored = agents
        .filter((a) => {
          if (teamId && !a.teamMemberships?.some((m) => m.teamId === teamId)) return false;
          const current = a.assignedTickets?.length || 0;
          const max = a.agentProfile?.maxConcurrentTickets ?? 5;
          return current < max;
        })
        .map((a) => {
          const current = a.assignedTickets?.length || 0;
          const max = a.agentProfile?.maxConcurrentTickets ?? 5;
          const skills = (a.agentProfile?.skills as string[]) || [];
          const languages = (a.agentProfile as any)?.languages || [];

          const capacityScore = 1 - Math.min(1, current / Math.max(1, max)); // 1 best, 0 worst
          const skillMatch = mergedSkills.length ? mergedSkills.filter((s) => skills.includes(s)).length / mergedSkills.length : 0;
          const languageMatch = detectedLanguage ? (languages as string[]).includes(detectedLanguage) ? 1 : 0 : 0.5; // neutral if unknown
          const teamAlign = teamId ? (a.teamMemberships?.some((m) => m.teamId === teamId) ? 1 : 0) : 0.5;

          // Optional: quick performance proxy (avg response in last 30d)
          // Keep as no-op placeholder to avoid N+1 queries here; value in [0..1]
          const performanceScore = 0.5;

          const score =
            weights.capacity * capacityScore +
            weights.skills * skillMatch +
            weights.language * languageMatch +
            weights.team * teamAlign +
            weights.performance * performanceScore;

          return { id: a.id, score, current, capacityScore, skillMatch, languageMatch, teamAlign, at: now };
        })
        .sort((x, y) => y.score - x.score);

      return scored[0]?.id ?? null;
    } catch (error) {
      this.logger.error(`Failed to suggest agent: ${String(error)}`);
      return null;
    }
  }

  private getWeights(params: { urgencyLevel: 'low' | 'medium' | 'high' | 'critical'; isVip: boolean }) {
    const base = { capacity: 0.35, skills: 0.35, language: 0.1, team: 0.1, performance: 0.1 };
    if (params.isVip) {
      base.skills += 0.05; base.capacity += 0.05; base.performance += 0.05;
      const k = 1 / (base.capacity + base.skills + base.language + base.team + base.performance);
      return { capacity: base.capacity * k, skills: base.skills * k, language: base.language * k, team: base.team * k, performance: base.performance * k };
    }
    if (params.urgencyLevel === 'high' || params.urgencyLevel === 'critical') {
      base.capacity += 0.1; base.skills += 0.05;
      const k = 1 / (base.capacity + base.skills + base.language + base.team + base.performance);
      return { capacity: base.capacity * k, skills: base.skills * k, language: base.language * k, team: base.team * k, performance: base.performance * k };
    }
    return base;
  }

  private async getAISignalsSafe(params: { tenantId: string; content?: string; channelType?: string; languageHint?: string }): Promise<{ language?: string; urgencyLevel?: 'low'|'medium'|'high'|'critical'; inferredSkills?: string[] } | undefined> {
    try {
      if (!this.ai || typeof this.ai.analyzeContent !== 'function') {
        return undefined;
      }
      const text = (params.content || '').trim();
      if (!text) return undefined;
      const result = await this.ai.analyzeContent({
        content: text,
        context: { tenantId: params.tenantId, channelType: params.channelType },
        analysisTypes: ['language_detection', 'urgency_detection', 'intent_classification'] as unknown as string[],
      });
      const lang = (result.results as Record<string, unknown>)?.languageDetection as { language?: string } | undefined;
      const urgency = (result.results as Record<string, unknown>)?.urgencyDetection as { urgencyLevel?: 'low'|'medium'|'high'|'critical' } | undefined;
      const intent = (result.results as Record<string, unknown>)?.intentClassification as { primaryIntent?: string } | undefined;
      const inferredSkills = this.mapIntentToSkills(intent?.primaryIntent);
      return { language: lang?.language, urgencyLevel: urgency?.urgencyLevel, inferredSkills };
    } catch {
      return undefined;
    }
  }

  private mapIntentToSkills(intent?: string): string[] {
    if (!intent) return [];
    const key = intent.toLowerCase();
    if (/(billing|invoice|payment)/.test(key)) return ['billing'];
    if (/(integration|api|webhook)/.test(key)) return ['integration','api'];
    if (/(onboard|setup|getting started)/.test(key)) return ['onboarding'];
    if (/(bug|error|technical|issue|login)/.test(key)) return ['technical'];
    if (/(cancel|refund|downgrade)/.test(key)) return ['billing','retention'];
    return [];
  }

  /**
   * Recommend agent assignment based on triage predictions.
   * This is called after triage analysis to auto-assign tickets based on AI predictions.
   */
  async recommendAssignment(params: {
    tenantId: string;
    intent?: string;
    category?: string;
    priority?: string;
    urgencyLevel?: string;
    language?: string;
    entities?: Array<{ type: string; value: string }>;
    customerId?: string;
    teamId?: string;
  }): Promise<string | null> {
    try {
      const inferredSkills = this.mapIntentToSkills(params.intent);
      
      // Map category to additional skills
      if (params.category) {
        const categorySkills = this.mapCategoryToSkills(params.category);
        inferredSkills.push(...categorySkills);
      }

      return await this.suggestAgent({
        tenantId: params.tenantId,
        customerId: params.customerId,
        teamId: params.teamId,
        priority: params.priority,
        requiredSkills: Array.from(new Set(inferredSkills)),
        languageHint: params.language,
      });
    } catch (error) {
      this.logger.error(`Failed to recommend assignment: ${String(error)}`);
      return null;
    }
  }

  private mapCategoryToSkills(category: string): string[] {
    const key = category.toLowerCase();
    if (/(billing|payment|invoice)/.test(key)) return ['billing'];
    if (/(technical|tech|integration)/.test(key)) return ['technical'];
    if (/(shipping|delivery|logistics)/.test(key)) return ['logistics'];
    if (/(product|catalog)/.test(key)) return ['product'];
    if (/(account|profile|settings)/.test(key)) return ['account'];
    return [];
  }

  /**
   * Get routing suggestions with detailed explanations for a ticket.
   * Returns top N agents with scores and reasoning.
   */
  async getRoutingSuggestions(
    context: RoutingContext,
    limit = 5
  ): Promise<Array<{
    agentId: string;
    score: number;
    reasoning: {
      capacityScore: number;
      skillMatch: number;
      languageMatch: number;
      teamAlign: number;
      performanceScore: number;
      matchedSkills: string[];
      missingSkills: string[];
      currentLoad: number;
      maxCapacity: number;
      languageMatchDetails?: string;
      teamMatchDetails?: string;
    };
  }>> {
    try {
      const { tenantId, teamId, requiredSkills = [], customerId } = context;
      const content = `${context.subject || ''} ${context.description || ''}`.trim();

      // Get AI signals
      const aiSignals = await this.getAISignalsSafe({
        tenantId,
        content,
        channelType: context.channelType,
        languageHint: context.languageHint,
      });
      const detectedLanguage = aiSignals?.language || context.languageHint || undefined;
      const inferredSkills = aiSignals?.inferredSkills || [];
      const urgencyLevel = aiSignals?.urgencyLevel || 'medium';
      const mergedSkills = Array.from(new Set([...(requiredSkills || []), ...inferredSkills]));

      // Check VIP status
      let isVip = false;
      if (customerId) {
        try {
          const advDb = this.database as unknown as {
            customerAdvanced?: {
              findUnique: (args: { where: { id: string } }) => Promise<{ isVip?: boolean } | null>;
            };
          };
          const customer = await advDb.customerAdvanced?.findUnique({
            where: { id: customerId },
          });
          isVip = !!customer?.isVip;
        } catch (err) {
          this.logger.debug(`VIP check failed for customer ${customerId}: ${String(err)}`);
        }
      }

      // Load agents with user details
      const agents = await this.database.user.findMany({
        where: {
          tenantId,
          agentProfile: {
            is: {
              autoAssign: true,
            },
            isNot: null,
          },
          status: 'active',
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
          agentProfile: {
            select: {
              maxConcurrentTickets: true,
              skills: true,
              languages: true,
            },
          },
          teamMemberships: {
            select: { teamId: true },
          },
          assignedTickets: {
            where: { status: { in: ['open', 'pending', 'in_progress', 'waiting'] } },
            select: { id: true },
          },
        },
      });

      if (!agents.length) {
        return [];
      }

      const weights = this.getWeights({ urgencyLevel, isVip });

      const scored = agents
        .filter((a) => {
          if (teamId && !a.teamMemberships?.some((m) => m.teamId === teamId)) return false;
          const current = a.assignedTickets?.length || 0;
          const max = a.agentProfile?.maxConcurrentTickets ?? 5;
          return current < max;
        })
        .map((a) => {
          const current = a.assignedTickets?.length || 0;
          const max = a.agentProfile?.maxConcurrentTickets ?? 5;
          const skills = (a.agentProfile?.skills as string[]) || [];
          const languages = (a.agentProfile?.languages as string[]) || [];

          const capacityScore = 1 - Math.min(1, current / Math.max(1, max));
          const matchedSkills = mergedSkills.filter((s) => skills.includes(s));
          const missingSkills = mergedSkills.filter((s) => !skills.includes(s));
          const skillMatch = mergedSkills.length ? matchedSkills.length / mergedSkills.length : 0;
          
          const languageMatch = detectedLanguage
            ? languages.includes(detectedLanguage)
              ? 1
              : 0
            : 0.5;
          
          const teamAlign = teamId
            ? a.teamMemberships?.some((m) => m.teamId === teamId)
              ? 1
              : 0
            : 0.5;

          const performanceScore = 0.5; // Placeholder

          const score =
            weights.capacity * capacityScore +
            weights.skills * skillMatch +
            weights.language * languageMatch +
            weights.team * teamAlign +
            weights.performance * performanceScore;

          return {
            agentId: a.id,
            score,
            reasoning: {
              capacityScore,
              skillMatch,
              languageMatch,
              teamAlign,
              performanceScore,
              matchedSkills,
              missingSkills,
              currentLoad: current,
              maxCapacity: max,
              languageMatchDetails: detectedLanguage
                ? languages.includes(detectedLanguage)
                  ? `Speaks ${detectedLanguage}`
                  : `Does not speak ${detectedLanguage}`
                : undefined,
              teamMatchDetails: teamId
                ? a.teamMemberships?.some((m) => m.teamId === teamId)
                  ? 'Member of required team'
                  : 'Not a member of required team'
                : undefined,
            },
          };
        })
        .sort((x, y) => y.score - x.score)
        .slice(0, limit);

      return scored;
    } catch (error) {
      this.logger.error(`Failed to get routing suggestions: ${String(error)}`);
      return [];
    }
  }
}


