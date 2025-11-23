'use client';

import React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIntegrationsStore } from '@/lib/store/integrations-store';

interface MappingEditorProps {
  provider: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MappingEditor({ provider, open, onOpenChange }: MappingEditorProps) {
  const { mappingsByProvider, fetchMappings, upsertMapping, deleteMapping, isLoading } = useIntegrationsStore();
  const mappings = mappingsByProvider[provider] || [];
  const [sourceEntity, setSourceEntity] = React.useState<string>('customer');
  const [targetEntity, setTargetEntity] = React.useState<string>('');
  const [crmField, setCrmField] = React.useState<string>('');
  const [glavitoField, setGlavitoField] = React.useState<string>('');

  React.useEffect(() => {
    if (open) fetchMappings(provider).catch(() => undefined);
  }, [open, provider, fetchMappings]);

  async function handleAdd() {
    if (!crmField || !glavitoField || !sourceEntity) return;
    const mappingsObj: Record<string, unknown> = {};
    mappingsObj[crmField] = glavitoField;
    await upsertMapping(provider, {
      sourceEntity,
      targetEntity: targetEntity || undefined,
      mappings: mappingsObj,
      direction: 'both',
      isActive: true,
    });
    setCrmField('');
    setGlavitoField('');
  }

  async function handleDelete(id: string) {
    await deleteMapping(provider, id);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Field Mapping</DrawerTitle>
          <DrawerDescription>Map provider fields to Glavito entities for sync</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm">Source Entity</Label>
              <Input value={sourceEntity} onChange={(e) => setSourceEntity(e.target.value)} placeholder="customer | lead | deal" />
            </div>
            <div>
              <Label className="text-sm">Target Entity (optional)</Label>
              <Input value={targetEntity} onChange={(e) => setTargetEntity(e.target.value)} placeholder="contact | person | account" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm">CRM Field</Label>
              <Input value={crmField} onChange={(e) => setCrmField(e.target.value)} placeholder="Email or properties.email" />
            </div>
            <div>
              <Label className="text-sm">Glavito Field</Label>
              <Input value={glavitoField} onChange={(e) => setGlavitoField(e.target.value)} placeholder="email or customFields.crmEmail" />
            </div>
            <div className="flex items-end">
              <Button onClick={handleAdd} disabled={isLoading || !crmField || !glavitoField}>Add Mapping</Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source Entity</TableHead>
                <TableHead>Target Entity</TableHead>
                <TableHead>Mappings</TableHead>
                <TableHead>Direction</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{m.sourceEntity}</TableCell>
                  <TableCell>{m.targetEntity || '-'}</TableCell>
                  <TableCell className="text-xs">{JSON.stringify(m.mappings)}</TableCell>
                  <TableCell>{m.direction}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => handleDelete(m.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {!mappings.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">No mappings yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DrawerFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}


