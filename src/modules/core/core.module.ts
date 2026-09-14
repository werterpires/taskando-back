import { Global, Module } from "@nestjs/common";
import { AuthService } from "../../auth/auth.service";
import { DomainService } from "../../http/domain.service";
import { ProjectionCache } from "../../http/projection-cache";

@Global()
@Module({ providers: [AuthService, ProjectionCache, DomainService], exports: [AuthService, ProjectionCache, DomainService] })
export class CoreModule {}
