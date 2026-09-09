import { Controller, Get, Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { DomainService } from './http/domain.service';
import { domainControllers } from './http/domain.controllers';
import { McpController } from './http/mcp.controller';
@Controller('api/health')
class HealthController { @Get() health() { return { status: 'ok', service: 'taskando-api' }; } }
@Module({ controllers: [HealthController, AuthController, McpController, ...domainControllers], providers: [AuthService, DomainService] })
export class AppModule {}
