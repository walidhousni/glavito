'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useIntegrationsStore } from '@/lib/store/integrations-store';
import { integrationsApi } from '@/lib/api/integrations';

interface RulesEditorProps {
  provider: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RulesEditor({ provider, open, onOpenChange }: RulesEditorProps) {
  const { connectors, fetchConnectors } = useIntegrationsStore();
  const connector = connectors.find(c => c.provider === provider);
  const config = (connector?.config || {}) as any;

  const [autoCustomer, setAutoCustomer] = React.useState<boolean>(config?.autoCreate?.customer ?? true);
  const [autoTicket, setAutoTicket] = React.useState<'true' | 'false' | 'conditional'>(config?.autoCreate?.ticket === true ? 'true' : config?.autoCreate?.ticket === false ? 'false' : 'conditional');
  const [highValue, setHighValue] = React.useState<string>(String(config?.ticketRules?.highValueOrder ?? '0'));
  const [paymentFailed, setPaymentFailed] = React.useState<boolean>(Boolean(config?.ticketRules?.paymentFailed));
  const [fulfillmentError, setFulfillmentError] = React.useState<boolean>(Boolean(config?.ticketRules?.fulfillmentError));

  React.useEffect(() => {
    if (open && connector) {
      const cfg = (connector.config || {}) as any;
      setAutoCustomer(cfg?.autoCreate?.customer ?? true);
      setAutoTicket(cfg?.autoCreate?.ticket === true ? 'true' : cfg?.autoCreate?.ticket === false ? 'false' : 'conditional');
      setHighValue(String(cfg?.ticketRules?.highValueOrder ?? '0'));
      setPaymentFailed(Boolean(cfg?.ticketRules?.paymentFailed));
      setFulfillmentError(Boolean(cfg?.ticketRules?.fulfillmentError));
    }
  }, [open, connector]);

  async function handleSave() {
    const rules = {
      autoCreate: {
        customer: autoCustomer,
        ticket: autoTicket === 'true' ? true : autoTicket === 'false' ? false : 'conditional',
      },
      ticketRules: {
        highValueOrder: Number(highValue) || 0,
        paymentFailed,
        fulfillmentError,
      },
    };
    await integrationsApi.setConnectorRules(provider, rules);
    await fetchConnectors();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connector Rules</DialogTitle>
          <DialogDescription>Control auto-create and ticket creation rules</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Auto-create Customer</Label>
              <p className="text-xs text-muted-foreground">Create or update customers from inbound webhooks</p>
            </div>
            <Switch checked={autoCustomer} onCheckedChange={setAutoCustomer} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Auto-create Ticket</Label>
            <div className="grid grid-cols-3 gap-2">
              <Button variant={autoTicket === 'true' ? 'default' : 'outline'} onClick={() => setAutoTicket('true')}>Always</Button>
              <Button variant={autoTicket === 'conditional' ? 'default' : 'outline'} onClick={() => setAutoTicket('conditional')}>Conditional</Button>
              <Button variant={autoTicket === 'false' ? 'default' : 'outline'} onClick={() => setAutoTicket('false')}>Never</Button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-3">
              <Label className="text-sm font-medium">High value order (cents)</Label>
              <Input value={highValue} onChange={(e) => setHighValue(e.target.value)} placeholder="e.g., 50000" />
            </div>
            <div className="flex items-center justify-between col-span-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Ticket on payment failed</Label>
                <p className="text-xs text-muted-foreground">Create ticket when payment fails</p>
              </div>
              <Switch checked={paymentFailed} onCheckedChange={setPaymentFailed} />
            </div>
            <div className="flex items-center justify-between col-span-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Ticket on fulfillment error</Label>
                <p className="text-xs text-muted-foreground">Create ticket when shipment encounters errors</p>
              </div>
              <Switch checked={fulfillmentError} onCheckedChange={setFulfillmentError} />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


