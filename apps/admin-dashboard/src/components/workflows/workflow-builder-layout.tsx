'use client';

import React, { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Layers, 
  Settings, 
  Play, 
  Save, 
  Eye, 
  Activity, 
  Palette,
  PanelLeftOpen,
  PanelRightOpen,
  Maximize2,
  Minimize2,
  Zap,
  Bot,
  Mail,
  Database,
  GitBranch,
  Timer,
  Flag,
  Bell,
  Link2,
  Webhook as WebhookIcon,
  Plus,
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react';

interface WorkflowBuilderLayoutProps {
  children: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  toolbar?: React.ReactNode;
  workflow?: {
    name: string;
    isActive: boolean;
    type: string;
    id: string;
  };
  onSave?: () => void;
  onExecute?: () => void;
  loading?: boolean;
}

const NodePalettePanel = () => {
  const nodeTypes = [
    { type: 'input', label: 'Start', icon: Play, category: 'triggers', color: 'bg-green-500' },
    { type: 'output', label: 'End', icon: Flag, category: 'triggers', color: 'bg-red-500' },
    { type: 'condition', label: 'Condition', icon: GitBranch, category: 'logic', color: 'bg-blue-500' },
    { type: 'delay', label: 'Delay', icon: Timer, category: 'logic', color: 'bg-orange-500' },
    { type: 'send_email', label: 'Send Email', icon: Mail, category: 'actions', color: 'bg-purple-500' },
    { type: 'send-notification', label: 'Notification', icon: Bell, category: 'actions', color: 'bg-yellow-500' },
    { type: 'api_call', label: 'API Call', icon: Link2, category: 'actions', color: 'bg-indigo-500' },
    { type: 'webhook', label: 'Webhook', icon: WebhookIcon, category: 'actions', color: 'bg-pink-500' },
    { type: 'database_query', label: 'Database', icon: Database, category: 'data', color: 'bg-cyan-500' },
    { type: 'ai-analysis', label: 'AI Analysis', icon: Bot, category: 'ai', color: 'bg-emerald-500' },
  ];

  const categories = [
    { id: 'triggers', label: 'Triggers', color: 'text-green-600' },
    { id: 'logic', label: 'Logic', color: 'text-blue-600' },
    { id: 'actions', label: 'Actions', color: 'text-purple-600' },
    { id: 'data', label: 'Data', color: 'text-cyan-600' },
    { id: 'ai', label: 'AI & ML', color: 'text-emerald-600' },
  ];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredNodes = nodeTypes.filter(node => {
    const matchesSearch = node.label.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || node.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full flex flex-col bg-card border-r">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Node Palette</h3>
        </div>
        
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap gap-1">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="text-xs h-7"
          >
            All
          </Button>
          {categories.map(category => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="text-xs h-7"
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {categories.map(category => {
          const categoryNodes = filteredNodes.filter(node => node.category === category.id);
          if (categoryNodes.length === 0) return null;

          return (
            <div key={category.id} className="space-y-2">
              <h4 className={`text-sm font-medium ${category.color} flex items-center gap-2`}>
                {category.label}
                <Badge variant="secondary" className="text-xs">
                  {categoryNodes.length}
                </Badge>
              </h4>
              <div className="space-y-1">
                {categoryNodes.map(node => (
                  <TooltipProvider key={node.type}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="w-full p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-left group"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/reactflow', node.type);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${node.color} text-white group-hover:scale-110 transition-transform`}>
                              <node.icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">{node.label}</div>
                              <div className="text-xs text-muted-foreground capitalize">{node.category}</div>
                            </div>
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Drag to add {node.label} node</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const PropertiesPanel = ({ selectedNode }: { selectedNode?: any }) => {
  return (
    <div className="h-full flex flex-col bg-card border-l">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Properties</h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {selectedNode ? (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Node Name</label>
              <input
                type="text"
                value={selectedNode.data?.label || ''}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="Enter node name..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Node Type</label>
              <Badge variant="outline" className="capitalize">
                {selectedNode.type}
              </Badge>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium mb-2 block">Configuration</label>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                    rows={3}
                    placeholder="Describe what this node does..."
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Settings className="h-8 w-8 text-muted-foreground" />
            </div>
            <h4 className="font-medium mb-2">No Node Selected</h4>
            <p className="text-sm text-muted-foreground">
              Select a node to view and edit its properties
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export function WorkflowBuilderLayout({
  children,
  leftPanel,
  rightPanel,
  toolbar,
  workflow,
  onSave,
  onExecute,
  loading = false
}: WorkflowBuilderLayoutProps) {
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background">
        {/* Enhanced Header */}
        <div className="border-b bg-card/50 backdrop-blur-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    {workflow?.isActive && (
                      <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
                    )}
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-foreground">
                      {workflow?.name || 'Workflow Designer'}
                    </h1>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant={workflow?.isActive ? 'default' : 'secondary'} className="text-xs">
                        {workflow?.isActive ? 'Active' : 'Draft'}
                      </Badge>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground capitalize">
                        {workflow?.type || 'Workflow'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Panel toggles */}
                <div className="flex items-center gap-1 mr-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                        className="h-8 w-8 p-0"
                      >
                        <PanelLeftOpen className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle left panel</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
                        className="h-8 w-8 p-0"
                      >
                        <PanelRightOpen className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle right panel</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="h-8 w-8 p-0"
                      >
                        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Toggle fullscreen</TooltipContent>
                  </Tooltip>
                </div>

                {/* Action buttons */}
                <Button variant="outline" size="sm" disabled={loading}>
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                
                <Button variant="outline" size="sm" onClick={onExecute} disabled={loading}>
                  <Play className="h-4 w-4 mr-2" />
                  Test Run
                </Button>

                <Button onClick={onSave} disabled={loading} size="sm" className="bg-primary hover:bg-primary/90">
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>

                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Custom toolbar */}
        {toolbar && (
          <div className="border-b bg-muted/30">
            <div className="px-6 py-2">
              {toolbar}
            </div>
          </div>
        )}

        {/* Main content area */}
        <div className="flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* Left Panel - Node Palette */}
            {!leftPanelCollapsed && (
              <>
                <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                  {leftPanel || <NodePalettePanel />}
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            {/* Center Panel - Canvas */}
            <ResizablePanel defaultSize={leftPanelCollapsed && rightPanelCollapsed ? 100 : 60} minSize={40}>
              <div className="h-full relative bg-muted/20">
                {children}
              </div>
            </ResizablePanel>

            {/* Right Panel - Properties */}
            {!rightPanelCollapsed && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                  {rightPanel || <PropertiesPanel />}
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </div>

        {/* Status bar */}
        <div className="border-t bg-card/50 backdrop-blur-sm px-6 py-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Ready</span>
              </div>
              {workflow?.id && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">ID:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{workflow.id}</code>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-muted-foreground">
              <span>Zoom: 100%</span>
              <span>•</span>
              <span>Auto-save enabled</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}