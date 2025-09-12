import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { Prisma } from '@prisma/client';

export interface CreateCustomFieldDto {
  entity: 'ticket' | 'customer';
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'email' | 'phone' | 'url';
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  defaultValue?: Prisma.InputJsonValue;
  validation?: Prisma.InputJsonValue;
  conditions?: Prisma.InputJsonValue;
  sortOrder?: number;
  isActive?: boolean;
}

export type UpdateCustomFieldDto = Partial<CreateCustomFieldDto>;

@Injectable()
export class CustomFieldsService {
  constructor(private readonly db: DatabaseService) {}

  async list(tenantId: string, entity?: 'ticket' | 'customer') {
    return this.db.customFieldDefinition.findMany({
      where: { tenantId, ...(entity ? { entity } : {}) },
      orderBy: [{ entity: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async get(tenantId: string, id: string) {
    const field = await this.db.customFieldDefinition.findFirst({ where: { id, tenantId } });
    if (!field) throw new NotFoundException('Custom field not found');
    return field;
  }

  async create(tenantId: string, dto: CreateCustomFieldDto) {
    if (!dto.name.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
      throw new BadRequestException('Invalid field name');
    }
    const createData: Prisma.CustomFieldDefinitionCreateInput = {
      tenantId,
      entity: dto.entity,
      name: dto.name,
      label: dto.label,
      type: dto.type,
      required: !!dto.required,
      options: (dto.options as unknown as Prisma.InputJsonValue) ?? undefined,
      defaultValue: (dto.defaultValue as unknown as Prisma.InputJsonValue) ?? undefined,
      validation: (dto.validation as any) ?? undefined,
      conditions: (dto.conditions as any) ?? undefined,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
    };
    return this.db.customFieldDefinition.create({ data: createData });
  }

  async update(tenantId: string, id: string, dto: UpdateCustomFieldDto) {
    await this.get(tenantId, id);
    if (dto.name && !dto.name.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
      throw new BadRequestException('Invalid field name');
    }
    const data: Prisma.CustomFieldDefinitionUpdateInput = {};
    if (dto.entity !== undefined) data.entity = dto.entity;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.required !== undefined) data.required = !!dto.required;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.options !== undefined) data.options = dto.options as unknown as Prisma.InputJsonValue;
    if (dto.defaultValue !== undefined) data.defaultValue = dto.defaultValue as unknown as Prisma.InputJsonValue;
    if (dto.validation !== undefined) data.validation = dto.validation as any;
    if (dto.conditions !== undefined) data.conditions = dto.conditions as any;

    return this.db.customFieldDefinition.update({
      where: { id },
      data,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.get(tenantId, id);
    await this.db.customFieldDefinition.delete({ where: { id } });
    return { success: true };
  }
}


