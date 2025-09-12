import { Module } from '@nestjs/common'
import { DatabaseModule } from '@glavito/shared-database'
import { AnalyticsService } from './services/analytics.service'

// Make Kafka optional to avoid startup failures when the Kafka lib/broker is unavailable
let KafkaModuleSafe: any
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  KafkaModuleSafe = require('@glavito/shared-kafka').KafkaModule
} catch {
  KafkaModuleSafe = class OptionalKafkaModule {}
}

@Module({
  imports: [DatabaseModule, KafkaModuleSafe],
  providers: [AnalyticsService],
  exports: [AnalyticsService]
})
export class AnalyticsModule {}