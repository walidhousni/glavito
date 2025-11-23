import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, HelperText, useTheme } from 'react-native-paper';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { listTeams, Team } from '../../lib/teams.api';
import { listChannels, Channel } from '../../lib/channels.api';
import { listTicketFieldDefinitions, CustomFieldDefinition } from '../../lib/custom-fields.api';
import { createTicket } from '../../lib/tickets.api';
import { PickerField } from '../../components/ui/PickerField';
import { CustomFieldsForm } from '../../components/tickets/CustomFieldsForm';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { searchCustomers, Customer } from '../../lib/customers.api';

const schema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().optional(),
  priority: z.enum(['low','medium','high','urgent']),
  teamId: z.string().optional(),
  channelId: z.string().optional(),
  customerId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
});

type FormValues = z.infer<typeof schema>;

type Props = NativeStackScreenProps<RootStackParamList, 'MainTabs'>;

export function TicketCreateScreen(_props: Props) {
  const theme = useTheme();
  const methods = useForm<FormValues>({ resolver: zodResolver(schema) as any, defaultValues: { priority: 'medium', customFields: {} } });
  const { control, handleSubmit, formState: { errors }, setValue, watch } = methods;
  const [teams, setTeams] = useState<Team[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [fields, setFields] = useState<CustomFieldDefinition[]>([]);
  const [customerQ, setCustomerQ] = useState('');
  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [t, c, f] = await Promise.all([
          listTeams(false),
          listChannels(),
          listTicketFieldDefinitions(),
        ]);
        if (!mounted) return;
        setTeams(t);
        setChannels(c);
        setFields(f);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false };
  }, []);

  const onSubmit = async (data: FormValues) => {
    const payload = { ...data };
    await createTicket(payload as any);
  };

  const selectedTeam = teams.find((x) => x.id === watch('teamId')) || null;
  const selectedChannel = channels.find((x) => x.id === watch('channelId')) || null;

  return (
    <FormProvider {...methods}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text variant="headlineSmall" style={{ marginBottom: 12 }}>New Ticket</Text>
        <Controller
          control={control}
          name="subject"
          render={({ field }) => (
            <View>
              <TextInput mode="outlined" label="Subject" value={field.value} onChangeText={field.onChange} />
              {errors.subject?.message ? <HelperText type="error">{errors.subject.message}</HelperText> : null}
            </View>
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <TextInput mode="outlined" label="Description" value={field.value} onChangeText={field.onChange} multiline numberOfLines={4} style={{ marginTop: 8 }} />
          )}
        />

        <Text style={{ marginTop: 12, marginBottom: 4 }}>Priority</Text>
        <Controller
          control={control}
          name="priority"
          render={({ field }) => (
            <SegmentedButtons
              value={field.value}
              onValueChange={field.onChange}
              buttons={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
            />
          )}
        />

        <View style={{ marginTop: 12 }}>
          <PickerField label="Team" items={teams.map((t) => ({ ...t, name: t.name }))} value={selectedTeam as any} onChange={(it) => setValue('teamId', it?.id)} />
        </View>
        <View style={{ marginTop: 12 }}>
          <PickerField label="Channel" items={channels.map((c) => ({ ...c, name: c.name || c.type }))} value={selectedChannel as any} onChange={(it) => setValue('channelId', it?.id)} />
        </View>

        <View style={{ marginTop: 16 }}>
          <Text variant="titleMedium" style={{ marginBottom: 8 }}>Custom fields</Text>
          <CustomFieldsForm fields={fields} />
        </View>

        <View style={{ marginTop: 16 }}>
          <Text variant="titleMedium" style={{ marginBottom: 8 }}>Customer</Text>
          <TextInput mode="outlined" placeholder="Search customer" value={customerQ} onChangeText={async (q) => {
            setCustomerQ(q);
            if (q.trim().length >= 2) {
              const res = await searchCustomers(q.trim());
              setCustomerOptions(res);
            } else {
              setCustomerOptions([]);
            }
          }} left={<TextInput.Icon icon="magnify" />} />
          {customerOptions.map((c) => (
            <Button key={c.id} onPress={() => setValue('customerId', c.id)} style={{ marginTop: 6 }} mode={watch('customerId') === c.id ? 'contained' : 'outlined'}>
              {(c.firstName || '') + ' ' + (c.lastName || '') || c.email || c.id}
            </Button>
          ))}
        </View>

        <Button mode="contained" onPress={handleSubmit(onSubmit)} loading={loading} style={{ marginTop: 16 }} icon="check">Create Ticket</Button>
      </ScrollView>
    </FormProvider>
  );
}

export default TicketCreateScreen;


