import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';

@Injectable()
export class CustomFieldsService {
  constructor(private readonly db: DatabaseService) {}

  // ----- Custom Field Definitions -----
  async listDefinitions(tenantId: string, entity?: string) {
    const where: any = { tenantId };
    if (entity) where.entity = entity;
    return this.db.customFieldDefinition.findMany({ where, orderBy: [{ entity: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  async createDefinition(tenantId: string, dto: any) {
    if (!dto?.entity || !dto?.name || !dto?.label || !dto?.type) {
      throw new BadRequestException('entity, name, label and type are required');
    }
    return this.db.customFieldDefinition.create({
      data: {
        tenantId,
        entity: String(dto.entity),
        name: String(dto.name),
        label: String(dto.label),
        type: String(dto.type),
        required: Boolean(dto.required ?? false),
        options: dto.options ?? null,
        defaultValue: dto.defaultValue ?? null,
        validation: dto.validation ?? null,
        conditions: dto.conditions ?? null,
        sortOrder: Number(dto.sortOrder ?? 0),
        isActive: Boolean(dto.isActive ?? true),
        version: Number(dto.version ?? 1),
        readOnly: Boolean(dto.readOnly ?? false),
        rolesAllowed: Array.isArray(dto.rolesAllowed) ? dto.rolesAllowed : [],
        description: dto.description ?? null,
        group: dto.group ?? null,
      } as any,
    });
  }

  async updateDefinition(tenantId: string, id: string, dto: any) {
    const existing = await this.db.customFieldDefinition.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Custom field not found');
    return this.db.customFieldDefinition.update({ where: { id }, data: { ...dto } });
  }

  async deleteDefinition(tenantId: string, id: string) {
    const existing = await this.db.customFieldDefinition.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Custom field not found');
    await this.db.customFieldDefinition.delete({ where: { id } });
    return { success: true };
  }

  // ----- Custom Object Types -----
  async listObjectTypes(tenantId: string) {
    return this.db.customObjectType.findMany({ where: { tenantId, isActive: true }, orderBy: { createdAt: 'asc' } });
  }

  async createObjectType(tenantId: string, dto: any) {
    if (!dto?.name || !dto?.label) throw new BadRequestException('name and label are required');
    return this.db.customObjectType.create({
      data: {
        tenantId,
        name: String(dto.name),
        label: String(dto.label),
        description: dto.description ?? null,
        schema: dto.schema ?? {},
        relationships: dto.relationships ?? {},
        version: Number(dto.version ?? 1),
        isActive: Boolean(dto.isActive ?? true),
      } as any,
    });
  }

  async updateObjectType(tenantId: string, id: string, dto: any) {
    const existing = await this.db.customObjectType.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Custom object type not found');
    return this.db.customObjectType.update({ where: { id }, data: { ...dto } });
  }

  async deleteObjectType(tenantId: string, id: string) {
    const existing = await this.db.customObjectType.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Custom object type not found');
    await this.db.customObjectType.delete({ where: { id } });
    return { success: true };
  }

  // ----- Custom Object Records -----
  async listObjectRecords(tenantId: string, typeId: string) {
    return this.db.customObjectRecord.findMany({ where: { tenantId, typeId }, orderBy: { createdAt: 'desc' } });
  }

  async createObjectRecord(tenantId: string, typeId: string, values: any, references?: any) {
    // Basic existence check
    const type = await this.db.customObjectType.findFirst({ where: { id: typeId, tenantId } });
    if (!type) throw new NotFoundException('Custom object type not found');
    return this.db.customObjectRecord.create({
      data: {
        tenantId,
        typeId,
        values: values ?? {},
        references: references ?? {},
      } as any,
    });
  }

  async updateObjectRecord(tenantId: string, id: string, dto: { values?: any; references?: any }) {
    const existing = await this.db.customObjectRecord.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Custom object record not found');
    return this.db.customObjectRecord.update({ where: { id }, data: { ...dto } });
  }

  async deleteObjectRecord(tenantId: string, id: string) {
    const existing = await this.db.customObjectRecord.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Custom object record not found');
    await this.db.customObjectRecord.delete({ where: { id } });
    return { success: true };
  }
}


