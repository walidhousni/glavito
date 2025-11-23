'use client';

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Play,
  Flag,
  MoreVertical
} from 'lucide-react';
import { getWorkflowNodeIcon } from '@/lib/icons/workflow-icons';
import { cn } from '@/lib/utils';

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  status?: 'active' | 'inactive' | 'running' | 'success' | 'error';
  outputs?: string[];
  description?: string;
  configuration?: Record<string, any>;
  executionTime?: number;
  lastRun?: Date;
  isExpanded?: boolean;
  iconUrl?: string;
  }

export function WorkflowNode({ data, selected }: { data: WorkflowNodeData; selected?: boolean }) {
  const [isHovered, setIsHovered] = React.useState(false);
  const safeType = typeof data?.type === 'string' && data.type.trim() ? data.type : 'default';
  const iconUrl = data.iconUrl || getWorkflowNodeIcon(safeType);

  // Determine node type for styling
  const isStart = safeType === 'start' || safeType === 'input' || safeType === 'trigger';
  const isEnd = safeType === 'end' || safeType === 'output';
  const isAction = !isStart && !isEnd;

  // Get a simple description text
  const getStepDescription = () => {
    if (isStart) return 'No trigger selected';
    if (isEnd) return 'Conclude flow at Flow end';
    if (data.configuration?.text) return String(data.configuration.text).substring(0, 60);
    if (data.configuration?.message) return String(data.configuration.message).substring(0, 60);
    if (data.description) return data.description;
    return 'Please select';
  };

  return (
    <div 
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Top Handle - Clean circular connection point */}
      <Handle
        type="target"
        position={Position.Top}
        id="default"
        isConnectable={true}
        className={cn(
          "w-3 h-3 !bg-white border-2 border-blue-400 transition-all duration-200 cursor-crosshair",
          "hover:!w-4 hover:!h-4 hover:border-blue-600 shadow-sm"
        )}
        style={{ top: -6 }}
      />

      {/* Step Card - Clean SleekFlow-style design */}
      <div
        className={cn(
          "w-[280px] bg-white dark:bg-slate-900 rounded-xl border transition-all duration-200",
          selected && "ring-2 ring-blue-500 border-blue-500 shadow-lg",
          isHovered && !selected && "shadow-md border-blue-200 dark:border-blue-800",
          !selected && !isHovered && "border-gray-200 dark:border-slate-700 shadow-sm"
        )}
      >
        {/* Step Header - Clean header with icon */}
        <div className={cn(
          "px-4 py-3 rounded-t-xl flex items-center gap-3 border-b",
          isStart && "bg-blue-500 border-blue-600",
          isEnd && "bg-gray-700 dark:bg-gray-800 border-gray-800",
          isAction && "bg-gray-600 dark:bg-gray-700 border-gray-700"
        )}>
          {/* Icon */}
          <div className={cn(
            "flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center bg-white/20"
          )}>
            {isStart ? (
              <Play className="w-4 h-4 text-white" fill="currentColor" />
            ) : isEnd ? (
              <Flag className="w-4 h-4 text-white" />
            ) : (
              <img 
                src={iconUrl} 
                alt={data.type} 
                className="w-4 h-4 object-contain filter brightness-0 invert"
              />
            )}
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-white text-sm line-clamp-1">
              {data.label || (isStart ? 'Start' : isEnd ? 'Flow end' : 'The first node')}
            </h3>
        </div>

          {/* More menu */}
          {!isStart && (
                <button
              className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center hover:bg-white/20 transition-colors"
              onClick={(e) => e.stopPropagation()}
                >
              <MoreVertical className="w-4 h-4 text-white" />
                </button>
          )}
        </div>

        {/* Step Content - Clean white content area */}
        <div className="px-4 py-4 bg-white dark:bg-slate-900 rounded-b-xl min-h-[60px]">
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {getStepDescription()}
          </p>
        </div>
          </div>

      {/* Bottom Handle - Clean circular connection point (only show if no conditional outputs) */}
      {(!data.outputs || data.outputs.length <= 1) && (
      <Handle
        type="source"
        position={Position.Bottom}
          id="default"
          isConnectable={true}
        className={cn(
            "w-3 h-3 !bg-white border-2 border-blue-400 transition-all duration-200 cursor-crosshair",
            "hover:!w-4 hover:!h-4 hover:border-blue-600 shadow-sm"
        )}
        style={{ bottom: -6 }}
      />
      )}

      {/* Conditional Output Ports (for condition nodes) */}
      {data.outputs && data.outputs.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-around" style={{ bottom: -6 }}>
          {data.outputs.map((output, index) => {
            const outputColor = index === 0 ? 'border-green-500' : index === 1 ? 'border-amber-500' : 'border-red-500';
            return (
              <div key={output} className="relative">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
            <Handle
              type="source"
              position={Position.Bottom}
              id={output}
                        isConnectable={true}
                        className={cn(
                          "w-3 h-3 !bg-white border-2 transition-all duration-200 cursor-crosshair",
                          "hover:!w-4 hover:!h-4 hover:shadow-md",
                          outputColor
                        )}
              style={{
                          left: `${((index + 1) / ((data.outputs?.length || 0) + 1)) * 100}%`,
                transform: 'translateX(-50%)'
              }}
            />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">{output}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Export node types mapping for ReactFlow
export const workflowNodeTypes = {
  input: WorkflowNode,
  output: WorkflowNode,
  default: WorkflowNode,
  condition: WorkflowNode,
  delay: WorkflowNode,
  send_email: WorkflowNode,
  'send-notification': WorkflowNode,
  'send-email': WorkflowNode,
  'template-message': WorkflowNode,
  send_whatsapp: WorkflowNode,
  send_instagram: WorkflowNode,
  send_message: WorkflowNode,
  'api_call': WorkflowNode,
  'http': WorkflowNode,
  'http_request': WorkflowNode,
  'log-event': WorkflowNode,
  'ticket-assignment': WorkflowNode,
  'ticket-escalation': WorkflowNode,
  'ticket_create': WorkflowNode,
  'ticket_update': WorkflowNode,
  'ticket_assign': WorkflowNode,
  'ticket_close': WorkflowNode,
  'database_query': WorkflowNode,
  'ai-analysis': WorkflowNode,
  'ai_analysis': WorkflowNode,
  'ai_decision': WorkflowNode,
  'customer-lookup': WorkflowNode,
  'segment_check': WorkflowNode,
  'journey_tracker': WorkflowNode,
  'journey_checkpoint': WorkflowNode,
  // AI Orchestration
  'ai_agent': WorkflowNode,
  'ai_route': WorkflowNode,
  'ai_tool_call': WorkflowNode,
  'ai_guardrail': WorkflowNode,
  'churn_risk': WorkflowNode,
  'churn_risk_check': WorkflowNode,
  'track_event': WorkflowNode,
  'log_metric': WorkflowNode,
  'sentiment_analysis': WorkflowNode,
  'intent_detection': WorkflowNode,
  'set_variable': WorkflowNode,
  webhook: WorkflowNode,
  trigger: WorkflowNode,
  schedule: WorkflowNode,
  switch: WorkflowNode,
};

export default WorkflowNode;

