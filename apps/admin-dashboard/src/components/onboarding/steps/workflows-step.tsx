/**
 * Workflows Step - Placeholder
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Image from 'next/image';
import { motion } from 'framer-motion';

interface WorkflowsStepProps {
  data: Record<string, unknown>;
  onDataChange: (data: Record<string, unknown>) => void;
}

export function WorkflowsStep({ data, onDataChange }: WorkflowsStepProps) {
  const templates = [
    { id: 'welcome', name: 'Welcome Message', description: 'Auto-send welcome message to new customers' },
    { id: 'followup', name: 'Follow-up Reminder', description: 'Remind agents to follow up after 24h' },
    { id: 'escalation', name: 'Auto Escalation', description: 'Escalate tickets after threshold' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center mb-8">
        <Image src="https://img.icons8.com/?size=96&id=43738" alt="Workflows" width={80} height={80} className="mx-auto mb-4" />
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Setup Workflows
        </h2>
        <p className="text-gray-600 dark:text-gray-400">Automate common tasks</p>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Workflow Templates</CardTitle>
          <CardDescription>Select templates to activate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {templates.map((template) => (
            <div key={template.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
              <Checkbox
                checked={(data[template.id] as boolean) || false}
                onCheckedChange={(checked) => onDataChange({ ...data, [template.id]: checked })}
              />
              <div className="flex-1">
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-gray-500">{template.description}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
