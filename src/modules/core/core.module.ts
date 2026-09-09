import { Global, Module } from "@nestjs/common";
import { AuthService } from "../../auth/auth.service";
import { DomainService } from "../../http/domain.service";

@Global()
@Module({ providers: [AuthService, DomainService], exports: [AuthService, DomainService] })
export class CoreModule {}
