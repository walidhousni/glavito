import React from 'react';
import { View } from 'react-native';
import { Text, TextInput, Checkbox, HelperText } from 'react-native-paper';
import { Controller, useFormContext } from 'react-hook-form';
import type { CustomFieldDefinition } from '../../lib/custom-fields.api';

export function CustomFieldsForm({ fields }: { fields: CustomFieldDefinition[] }) {
  const { control, formState: { errors } } = useFormContext();
  return (
    <View style={{ gap: 12 }}>
      {fields.filter((f) => f.isActive !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((field) => {
        const name = `customFields.${field.name}` as const;
        const required = !!field.required;
        const err = (errors as any)?.customFields?.[field.name]?.message as string | undefined;
        switch (field.type) {
          case 'boolean':
            return (
              <Controller
                key={field.id}
                name={name as any}
                control={control}
                rules={required ? { required: `${field.label} is required` } : undefined}
                render={({ field: rhf }) => (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Checkbox status={rhf.value ? 'checked' : 'unchecked'} onPress={() => rhf.onChange(!rhf.value)} />
                    <Text>{field.label}</Text>
                  </View>
                )}
              />
            );
          case 'number':
            return (
              <Controller
                key={field.id}
                name={name as any}
                control={control}
                rules={required ? { required: `${field.label} is required` } : undefined}
                render={({ field: rhf }) => (
                  <View>
                    <TextInput
                      label={field.label}
                      value={rhf.value?.toString?.() ?? ''}
                      onChangeText={(v) => rhf.onChange(v.replace(/[^0-9.]/g, ''))}
                      keyboardType="numeric"
                      mode="outlined"
                    />
                    {err ? <HelperText type="error">{err}</HelperText> : null}
                  </View>
                )}
              />
            );
          default:
            return (
              <Controller
                key={field.id}
                name={name as any}
                control={control}
                rules={required ? { required: `${field.label} is required` } : undefined}
                render={({ field: rhf }) => (
                  <View>
                    <TextInput
                      label={field.label}
                      value={rhf.value?.toString?.() ?? ''}
                      onChangeText={rhf.onChange}
                      mode="outlined"
                    />
                    {err ? <HelperText type="error">{err}</HelperText> : null}
                  </View>
                )}
              />
            );
        }
      })}
    </View>
  );
}


