/**
 * Data Import Service Tests
 * Unit tests for data import and migration functionality
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataImportService, ImportJob, ImportMapping } from '../data-import.service';
import { DatabaseService } from '@glavito/shared-database';

describe('DataImportService', () => {
  let service: DataImportService;
  let databaseService: jest.Mocked<DatabaseService>;
  let configService: jest.Mocked<ConfigService>;
  let httpService: jest.Mocked<HttpService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';

  beforeEach(async () => {
    const mockDatabaseService = {
      customer: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      ticket: {
        create: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      knowledgeBaseArticle: {
        create: jest.fn(),
      },
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataImportService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<DataImportService>(DataImportService);
    databaseService = module.get(DatabaseService);
    configService = module.get(ConfigService);
    httpService = module.get(HttpService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createImportJob', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'customers.csv',
      encoding: '7bit',
      mimetype: 'text/csv',
      size: 1024,
      buffer: Buffer.from('name,email\nJohn Doe,john@example.com'),
      destination: '',
      filename: '',
      path: '',
      stream: null,
    };

    it('should create import job successfully', async () => {
      // Mock file system operations
      jest.spyOn(service as any, 'saveImportFile').mockResolvedValue('/tmp/import-file.csv');
      jest.spyOn(service as any, 'analyzeImportFile').mockResolvedValue({
        headers: ['name', 'email'],
        sampleData: [{ name: 'John Doe', email: 'john@example.com' }],
        suggestedMappings: [],
        validationResults: {
          totalRows: 1,
          validRows: 1,
          invalidRows: 0,
          warnings: [],
        },
      });
      jest.spyOn(service as any, 'saveImportJob').mockResolvedValue(undefined);

      const result = await service.createImportJob(mockTenantId, mockUserId, 'customers', mockFile);

      expect(result).toBeDefined();
      expect(result.tenantId).toBe(mockTenantId);
      expect(result.type).toBe('customers');
      expect(result.status).toBe('pending');
      expect(result.fileName).toBe('customers.csv');
      expect(result.createdBy).toBe(mockUserId);
    });

    it('should throw error for invalid file type', async () => {
      const invalidFile = { ...mockFile, mimetype: 'application/pdf' };

      await expect(
        service.createImportJob(mockTenantId, mockUserId, 'customers', invalidFile)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for file too large', async () => {
      const largeFile = { ...mockFile, size: 100 * 1024 * 1024 }; // 100MB

      await expect(
        service.createImportJob(mockTenantId, mockUserId, 'customers', largeFile)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getImportJob', () => {
    it('should return import job successfully', async () => {
      const mockJob: ImportJob = {
        id: 'job-123',
        tenantId: mockTenantId,
        type: 'customers',
        status: 'pending',
        fileName: 'customers.csv',
        fileSize: 1024,
        totalRecords: 10,
        processedRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        errors: [],
        createdBy: mockUserId,
        metadata: {},
      };

      jest.spyOn(service as any, 'loadImportJob').mockResolvedValue(mockJob);

      const result = await service.getImportJob(mockTenantId, 'job-123');

      expect(result).toEqual(mockJob);
    });

    it('should throw error for non-existent job', async () => {
      jest.spyOn(service as any, 'loadImportJob').mockResolvedValue(null);

      await expect(
        service.getImportJob(mockTenantId, 'non-existent')
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error for job from different tenant', async () => {
      const mockJob: ImportJob = {
        id: 'job-123',
        tenantId: 'different-tenant',
        type: 'customers',
        status: 'pending',
        fileName: 'customers.csv',
        fileSize: 1024,
        totalRecords: 10,
        processedRecords: 0,
        successfulRecords: 0,
        failedRecords: 0,
        errors: [],
        createdBy: mockUserId,
        metadata: {},
      };

      jest.spyOn(service as any, 'loadImportJob').mockResolvedValue(mockJob);

      await expect(
        service.getImportJob(mockTenantId, 'job-123')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('startImport', () => {
    const mockJob: ImportJob = {
      id: 'job-123',
      tenantId: mockTenantId,
      type: 'customers',
      status: 'pending',
      fileName: 'customers.csv',
      fileSize: 1024,
      totalRecords: 10,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      errors: [],
      createdBy: mockUserId,
      metadata: {},
    };

    const mockMappings: ImportMapping[] = [
      {
        sourceField: 'name',
        targetField: 'name',
        required: true,
      },
      {
        sourceField: 'email',
        targetField: 'email',
        required: true,
      },
    ];

    it('should start import successfully', async () => {
      jest.spyOn(service, 'getImportJob').mockResolvedValue(mockJob);
      jest.spyOn(service as any, 'saveImportJob').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'processImportJob').mockResolvedValue(undefined);

      const result = await service.startImport(mockTenantId, 'job-123', mockMappings);

      expect(result.status).toBe('processing');
      expect(result.startedAt).toBeDefined();
      expect(result.metadata.mappings).toEqual(mockMappings);
    });

    it('should throw error for job not in pending status', async () => {
      const processingJob = { ...mockJob, status: 'processing' as const };
      jest.spyOn(service, 'getImportJob').mockResolvedValue(processingJob);

      await expect(
        service.startImport(mockTenantId, 'job-123', mockMappings)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelImport', () => {
    it('should cancel import successfully', async () => {
      const mockJob: ImportJob = {
        id: 'job-123',
        tenantId: mockTenantId,
        type: 'customers',
        status: 'processing',
        fileName: 'customers.csv',
        fileSize: 1024,
        totalRecords: 10,
        processedRecords: 5,
        successfulRecords: 3,
        failedRecords: 2,
        errors: [],
        createdBy: mockUserId,
        metadata: {},
      };

      jest.spyOn(service, 'getImportJob').mockResolvedValue(mockJob);
      jest.spyOn(service as any, 'saveImportJob').mockResolvedValue(undefined);

      const result = await service.cancelImport(mockTenantId, 'job-123');

      expect(result.status).toBe('cancelled');
      expect(result.completedAt).toBeDefined();
    });

    it('should throw error for completed import', async () => {
      const completedJob: ImportJob = {
        id: 'job-123',
        tenantId: mockTenantId,
        type: 'customers',
        status: 'completed',
        fileName: 'customers.csv',
        fileSize: 1024,
        totalRecords: 10,
        processedRecords: 10,
        successfulRecords: 10,
        failedRecords: 0,
        errors: [],
        createdBy: mockUserId,
        metadata: {},
      };

      jest.spyOn(service, 'getImportJob').mockResolvedValue(completedJob);

      await expect(
        service.cancelImport(mockTenantId, 'job-123')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('validation methods', () => {
    describe('validateCustomerRow', () => {
      it('should pass validation for valid customer data', () => {
        const validData = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        };

        const errors = (service as any).validateCustomerRow(validData, 1);

        expect(errors).toHaveLength(0);
      });

      it('should fail validation for missing required fields', () => {
        const invalidData = {};

        const errors = (service as any).validateCustomerRow(invalidData, 1);

        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('Either name or email is required');
      });

      it('should fail validation for invalid email', () => {
        const invalidData = {
          name: 'John Doe',
          email: 'invalid-email',
        };

        const errors = (service as any).validateCustomerRow(invalidData, 1);

        expect(errors).toHaveLength(1);
        expect(errors[0].field).toBe('email');
        expect(errors[0].message).toContain('Invalid email format');
      });
    });

    describe('validateTicketRow', () => {
      it('should pass validation for valid ticket data', () => {
        const validData = {
          subject: 'Test Ticket',
          description: 'Test description',
          customerEmail: 'customer@example.com',
          status: 'open',
          priority: 'medium',
        };

        const errors = (service as any).validateTicketRow(validData, 1);

        expect(errors).toHaveLength(0);
      });

      it('should fail validation for missing required fields', () => {
        const invalidData = {
          description: 'Test description',
        };

        const errors = (service as any).validateTicketRow(invalidData, 1);

        expect(errors.length).toBeGreaterThan(0);
        expect(errors.some(e => e.field === 'subject')).toBe(true);
        expect(errors.some(e => e.field === 'customerEmail')).toBe(true);
      });

      it('should warn for invalid status', () => {
        const invalidData = {
          subject: 'Test Ticket',
          description: 'Test description',
          customerEmail: 'customer@example.com',
          status: 'invalid-status',
        };

        const errors = (service as any).validateTicketRow(invalidData, 1);

        expect(errors.some(e => e.field === 'status' && e.severity === 'warning')).toBe(true);
      });
    });
  });

  describe('mapping generation', () => {
    it('should generate customer mappings correctly', () => {
      const headers = ['customer_name', 'email_address', 'phone_number', 'company'];

      const mappings = (service as any).generateCustomerMappings(headers);

      expect(mappings).toHaveLength(4);
      expect(mappings.find(m => m.targetField === 'name')).toBeDefined();
      expect(mappings.find(m => m.targetField === 'email')).toBeDefined();
      expect(mappings.find(m => m.targetField === 'phone')).toBeDefined();
      expect(mappings.find(m => m.targetField === 'company')).toBeDefined();
    });

    it('should generate ticket mappings correctly', () => {
      const headers = ['ticket_subject', 'description', 'customer_email', 'status', 'priority'];

      const mappings = (service as any).generateTicketMappings(headers);

      expect(mappings).toHaveLength(5);
      expect(mappings.find(m => m.targetField === 'subject')).toBeDefined();
      expect(mappings.find(m => m.targetField === 'description')).toBeDefined();
      expect(mappings.find(m => m.targetField === 'customerEmail')).toBeDefined();
      expect(mappings.find(m => m.targetField === 'status')).toBeDefined();
      expect(mappings.find(m => m.targetField === 'priority')).toBeDefined();
    });
  });

  describe('data transformation', () => {
    it('should transform row data correctly', () => {
      const data = {
        customer_name: 'John Doe',
        email_address: 'john@example.com',
        phone_number: '+1234567890',
      };

      const mappings: ImportMapping[] = [
        {
          sourceField: 'customer_name',
          targetField: 'name',
          required: true,
        },
        {
          sourceField: 'email_address',
          targetField: 'email',
          required: true,
        },
        {
          sourceField: 'phone_number',
          targetField: 'phone',
          required: false,
        },
      ];

      const transformed = (service as any).transformRowData(data, mappings);

      expect(transformed).toEqual({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
      });
    });

    it('should apply transformations', () => {
      const data = {
        status: 'OPEN',
      };

      const mappings: ImportMapping[] = [
        {
          sourceField: 'status',
          targetField: 'status',
          required: false,
          transform: (value) => value.toLowerCase(),
        },
      ];

      const transformed = (service as any).transformRowData(data, mappings);

      expect(transformed.status).toBe('open');
    });

    it('should validate transformed data', () => {
      const data = {
        email: 'invalid-email',
      };

      const mappings: ImportMapping[] = [
        {
          sourceField: 'email',
          targetField: 'email',
          required: true,
          validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        },
      ];

      expect(() => {
        (service as any).transformRowData(data, mappings);
      }).toThrow('Invalid value for field email');
    });

    it('should throw error for missing required fields', () => {
      const data = {};

      const mappings: ImportMapping[] = [
        {
          sourceField: 'name',
          targetField: 'name',
          required: true,
        },
      ];

      expect(() => {
        (service as any).transformRowData(data, mappings);
      }).toThrow('Required field name is missing or empty');
    });
  });

  describe('import record methods', () => {
    describe('importCustomer', () => {
      it('should create new customer', async () => {
        const customerData = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
        };

        databaseService.customer.findFirst.mockResolvedValue(null);
        databaseService.customer.create.mockResolvedValue({
          id: 'customer-123',
          ...customerData,
          tenantId: mockTenantId,
        } as any);

        await (service as any).importCustomer(mockTenantId, customerData);

        expect(databaseService.customer.create).toHaveBeenCalledWith({
          data: {
            tenantId: mockTenantId,
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone,
            company: undefined,
            createdAt: expect.any(Date),
          },
        });
      });

      it('should update existing customer', async () => {
        const customerData = {
          name: 'John Doe Updated',
          email: 'john@example.com',
          phone: '+1234567890',
        };

        const existingCustomer = {
          id: 'customer-123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: null,
          company: null,
        };

        databaseService.customer.findFirst.mockResolvedValue(existingCustomer as any);
        databaseService.customer.update.mockResolvedValue({
          ...existingCustomer,
          ...customerData,
        } as any);

        await (service as any).importCustomer(mockTenantId, customerData);

        expect(databaseService.customer.update).toHaveBeenCalledWith({
          where: { id: existingCustomer.id },
          data: {
            name: customerData.name,
            phone: customerData.phone,
            company: existingCustomer.company,
          },
        });
      });
    });

    describe('importTicket', () => {
      it('should create ticket with existing customer', async () => {
        const ticketData = {
          subject: 'Test Ticket',
          description: 'Test description',
          customerEmail: 'customer@example.com',
          status: 'open' as const,
          priority: 'medium' as const,
        };

        const existingCustomer = {
          id: 'customer-123',
          email: 'customer@example.com',
        };

        databaseService.customer.findFirst.mockResolvedValue(existingCustomer as any);
        databaseService.ticket.create.mockResolvedValue({
          id: 'ticket-123',
          ...ticketData,
        } as any);

        await (service as any).importTicket(mockTenantId, ticketData);

        expect(databaseService.ticket.create).toHaveBeenCalledWith({
          data: {
            tenantId: mockTenantId,
            customerId: existingCustomer.id,
            subject: ticketData.subject,
            description: ticketData.description,
            status: ticketData.status,
            priority: ticketData.priority,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        });
      });

      it('should create customer and ticket for new customer', async () => {
        const ticketData = {
          subject: 'Test Ticket',
          description: 'Test description',
          customerEmail: 'newcustomer@example.com',
          status: 'open' as const,
          priority: 'medium' as const,
        };

        const newCustomer = {
          id: 'customer-456',
          email: 'newcustomer@example.com',
          name: 'newcustomer@example.com',
        };

        databaseService.customer.findFirst.mockResolvedValue(null);
        databaseService.customer.create.mockResolvedValue(newCustomer as any);
        databaseService.ticket.create.mockResolvedValue({
          id: 'ticket-123',
          ...ticketData,
        } as any);

        await (service as any).importTicket(mockTenantId, ticketData);

        expect(databaseService.customer.create).toHaveBeenCalledWith({
          data: {
            tenantId: mockTenantId,
            email: ticketData.customerEmail,
            name: ticketData.customerEmail,
          },
        });

        expect(databaseService.ticket.create).toHaveBeenCalledWith({
          data: {
            tenantId: mockTenantId,
            customerId: newCustomer.id,
            subject: ticketData.subject,
            description: ticketData.description,
            status: ticketData.status,
            priority: ticketData.priority,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        });
      });
    });
  });

  describe('utility methods', () => {
    describe('isValidEmail', () => {
      it('should validate correct email addresses', () => {
        const validEmails = [
          'test@example.com',
          'user.name@domain.co.uk',
          'user+tag@example.org',
        ];

        validEmails.forEach(email => {
          expect((service as any).isValidEmail(email)).toBe(true);
        });
      });

      it('should reject invalid email addresses', () => {
        const invalidEmails = [
          'invalid-email',
          '@example.com',
          'user@',
          'user@.com',
          'user name@example.com',
        ];

        invalidEmails.forEach(email => {
          expect((service as any).isValidEmail(email)).toBe(false);
        });
      });
    });

    describe('isValidPhone', () => {
      it('should validate correct phone numbers', () => {
        const validPhones = [
          '+1234567890',
          '1234567890',
          '+44 20 7946 0958',
          '(555) 123-4567',
        ];

        validPhones.forEach(phone => {
          expect((service as any).isValidPhone(phone)).toBe(true);
        });
      });

      it('should reject invalid phone numbers', () => {
        const invalidPhones = [
          'abc123',
          '123',
          '+',
          '++1234567890',
        ];

        invalidPhones.forEach(phone => {
          expect((service as any).isValidPhone(phone)).toBe(false);
        });
      });
    });
  });
});