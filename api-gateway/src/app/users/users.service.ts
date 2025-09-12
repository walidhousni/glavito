import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import * as bcrypt from 'bcryptjs';
import type { User, PaginationParams } from '@glavito/shared-types';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createUserDto: any): Promise<User> {
    const { email, password, firstName, lastName, role, tenantId } = createUserDto;

    // Check if user already exists
    const existingUser = await this.databaseService.user.findFirst({
      where: {
        email,
        tenantId,
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.databaseService.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role: role || 'agent',
        tenantId,
        status: 'active',
      },
    });

    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  }

  async findAll(query: PaginationParams = {}): Promise<User[]> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const users = await this.databaseService.user.findMany({
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return users as User[];
  }

  async findOne(id: string): Promise<User> {
    const user = await this.databaseService.user.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user as User;
  }

  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    const user = await this.databaseService.user.findFirst({
      where: {
        email,
        tenantId,
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user as User | null;
  }

  async update(id: string, updateUserDto: any): Promise<User> {
    await this.findOne(id); // Check if exists

    const updateData: any = { ...updateUserDto };

    // Hash password if provided
    if (updateData.password) {
      updateData.passwordHash = await bcrypt.hash(updateData.password, 12);
      delete updateData.password;
    }

    const user = await this.databaseService.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        avatar: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user as User;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // Check if exists

    await this.databaseService.user.delete({
      where: { id },
    });
  }
}