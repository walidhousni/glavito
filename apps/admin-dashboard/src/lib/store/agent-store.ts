import { create } from 'zustand';
import { agentApi, AgentProfile, UpdateAgentProfileRequest, AgentAvailabilityRequest, AgentPerformanceMetrics } from '@/lib/api/team';

interface AgentState {
  agents: AgentProfile[];
  currentAgent: AgentProfile | null;
  availableAgents: AgentProfile[];
  performanceMetrics: AgentPerformanceMetrics | null;
  topAgents: Array<{ userId: string; name: string; avatar?: string; ticketsResolved: number; ticketsAssigned: number; resolutionRate: number; averageFirstResponseMinutes: number }>;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAgents: () => Promise<void>;
  fetchAgent: (userId: string) => Promise<void>;
  fetchAvailableAgents: (params?: { skills?: string[]; languages?: string[]; maxLoad?: boolean }) => Promise<void>;
  fetchTopAgents: (params?: { limit?: number; from?: string; to?: string }) => Promise<void>;
  updateAgentProfile: (userId: string, data: UpdateAgentProfileRequest) => Promise<void>;
  updateAgentAvailability: (userId: string, data: AgentAvailabilityRequest) => Promise<void>;
  fetchAgentPerformance: (userId: string) => Promise<void>;
  setCurrentAgent: (agent: AgentProfile | null) => void;
  clearError: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  currentAgent: null,
  availableAgents: [],
  performanceMetrics: null,
  topAgents: [],
  isLoading: false,
  error: null,

  fetchAgents: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await agentApi.getAgentProfiles();
      const list = Array.isArray(result) ? result : [];
      set({ agents: list, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch agents',
        isLoading: false 
      });
    }
  },

  fetchAgent: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const agent = await agentApi.getAgentProfile(userId);
      set({ currentAgent: agent, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch agent',
        isLoading: false 
      });
    }
  },

  fetchAvailableAgents: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const result = await agentApi.getAvailableAgents(params);
      const list = Array.isArray(result) ? result : [];
      set({ availableAgents: list, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch available agents',
        isLoading: false 
      });
    }
  },

  fetchTopAgents: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const result = await agentApi.getTopAgents(params);
      const list = Array.isArray(result) ? result : [];
      set({ topAgents: list, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch top agents',
        isLoading: false 
      });
    }
  },

  updateAgentProfile: async (userId: string, data: UpdateAgentProfileRequest) => {
    set({ isLoading: true, error: null });
    try {
      const updatedAgent = await agentApi.updateAgentProfile(userId, data);
      
      // Update the agent in the list
      set(state => ({
        agents: state.agents.map(agent => 
          agent.userId === userId ? updatedAgent : agent
        ),
        currentAgent: state.currentAgent?.userId === userId ? updatedAgent : state.currentAgent,
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update agent profile',
        isLoading: false 
      });
    }
  },

  updateAgentAvailability: async (userId: string, data: AgentAvailabilityRequest) => {
    set({ isLoading: true, error: null });
    try {
      await agentApi.updateAgentAvailability(userId, data);
      
      // Update the agent's availability in the store
      set(state => ({
        agents: state.agents.map(agent => 
          agent.userId === userId 
            ? { ...agent, availability: data.availability }
            : agent
        ),
        currentAgent: state.currentAgent?.userId === userId 
          ? { ...state.currentAgent, availability: data.availability }
          : state.currentAgent,
        isLoading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update agent availability',
        isLoading: false 
      });
    }
  },

  fetchAgentPerformance: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const performanceMetrics = await agentApi.getAgentPerformanceMetrics(userId);
      set({ performanceMetrics, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to fetch agent performance',
        isLoading: false 
      });
    }
  },

  setCurrentAgent: (agent: AgentProfile | null) => {
    set({ currentAgent: agent });
  },

  clearError: () => {
    set({ error: null });
  },
}));