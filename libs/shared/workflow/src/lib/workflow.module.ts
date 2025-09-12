import { Module, DynamicModule } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { HttpModule, HttpService } from '@nestjs/axios'
import { DatabaseModule } from '@glavito/shared-database'
import { KafkaModule } from '@glavito/shared-kafka'
import { WorkflowService } from './services/workflow.service'
import { WorkflowExecutionService } from './services/workflow-execution.service'
import { N8NClient, N8NConfig } from './clients/n8n.client'
import { N8NSyncService } from './services/n8n-sync.service'

export interface WorkflowModuleOptions {
  n8n?: {
    baseUrl?: string
    apiKey?: string
    timeout?: number
    retryAttempts?: number
  }
}

@Module({})
export class WorkflowModule {
  static forRoot(options: WorkflowModuleOptions = {}): DynamicModule {
    return {
      module: WorkflowModule,
      imports: [
        ConfigModule,
        HttpModule,
        DatabaseModule,
        KafkaModule,
      ],
      providers: [
        {
          provide: 'N8N_CONFIG',
          useFactory: (configService: ConfigService): N8NConfig => ({
            baseUrl: options.n8n?.baseUrl || configService.get('N8N_BASE_URL', 'http://localhost:5678'),
            apiKey: options.n8n?.apiKey || configService.get('N8N_API_KEY', ''),
            timeout: options.n8n?.timeout || parseInt(configService.get('N8N_TIMEOUT', '30000')),
            retryAttempts: options.n8n?.retryAttempts || parseInt(configService.get('N8N_RETRY_ATTEMPTS', '3'))
          }),
          inject: [ConfigService]
        },
        {
          provide: N8NClient,
          useFactory: (httpService: HttpService, configService: ConfigService) => new N8NClient(httpService, configService),
          inject: [HttpService, ConfigService]
        },
        N8NSyncService,
        WorkflowService,
        WorkflowExecutionService
      ],
      exports: [
        N8NSyncService,
        WorkflowService,
        WorkflowExecutionService,
        N8NClient
      ],
      global: true
    }
  }

  static forFeature(): DynamicModule {
    return {
      module: WorkflowModule,
      imports: [
        // Ensure providers required by WorkflowService are available in this context
        HttpModule,
        DatabaseModule,
        KafkaModule,
      ],
      providers: [
        N8NSyncService,
        WorkflowService,
        WorkflowExecutionService
      ],
      exports: [
        N8NSyncService,
        WorkflowService,
        WorkflowExecutionService
      ]
    }
  }
}