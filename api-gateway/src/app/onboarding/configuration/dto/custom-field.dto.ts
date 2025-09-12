import { ApiProperty } from '@nestjs/swagger';

export class CustomFieldDto {
  @ApiProperty({ description: 'Field ID', required: false })
  id?: string;

  @ApiProperty({ description: 'Field name' })
  name?: string;

  @ApiProperty({ description: 'Field type' })
  type?: string;

  @ApiProperty({ description: 'Field label' })
  label?: string;

  @ApiProperty({ description: 'Field placeholder', required: false })
  placeholder?: string;

  @ApiProperty({ description: 'Whether field is required', default: false })
  required?: boolean;

  @ApiProperty({ description: 'Field options for select/radio types', required: false })
  options?: string[];

  @ApiProperty({ description: 'Default value', required: false })
  defaultValue?: any;

  @ApiProperty({ description: 'Validation rules', required: false })
  validation?: any;

  @ApiProperty({ description: 'Display order', default: 0 })
  order?: number;

  @ApiProperty({ description: 'Whether field is active', default: true })
  active?: boolean;
}