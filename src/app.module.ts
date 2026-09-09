import { Controller, Get, Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { McpController } from './http/mcp.controller';
import { CoreModule } from './modules/core/core.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { StructureModule } from './modules/structure/structure.module';
import { PlanningModule } from './modules/planning/planning.module';
import { RecurrenceModule } from './modules/recurrence/recurrence.module';
import { ListsModule } from './modules/lists/lists.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SystemModule } from './modules/system/system.module';
@Controller('api/health')
class HealthController { @Get() health() { return { status: 'ok', service: 'taskando-api' }; } }
@Module({
  imports: [CoreModule, TasksModule, ProjectsModule, OrganizationsModule, StructureModule, PlanningModule, RecurrenceModule, ListsModule, NotificationsModule, SystemModule],
  controllers: [HealthController, AuthController, McpController],
})
export class AppModule {}
