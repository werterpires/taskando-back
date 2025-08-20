import { Global, Module } from '@nestjs/common'
import { CustomLoggerService } from './custom-logger/custom-logger.service'
import { EncryptionService } from './encryption/encryption.service'

const services = [CustomLoggerService, EncryptionService]
@Global()
@Module({
  controllers: [],
  providers: services,
  exports: services
})
export class UtilsModuleModule {}
