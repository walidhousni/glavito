import { z } from 'zod'
import { NodeKind } from './types'

export const FlowNodeSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(NodeKind).or(z.string()),
  name: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  config: z.record(z.any()).optional(),
})

export const FlowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
})

export const FlowGraphSchema = z.object({
  nodes: z.array(FlowNodeSchema).default([]),
  edges: z.array(FlowEdgeSchema).default([]),
})

export type FlowGraphInput = z.infer<typeof FlowGraphSchema>


