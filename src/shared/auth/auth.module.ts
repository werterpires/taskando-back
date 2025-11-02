import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { LoginValidationMiddleware } from './middlewares/login-validation.middleware'
import { JwtModule } from '@nestjs/jwt'
import { AuthRepo } from './auth.repo'
import { LocalStrategy } from './strategies/local.strategy'
import { PassportModule } from '@nestjs/passport'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtStrategy } from './strategies/jwt.strategy'
import { User } from '../../users/entities/user.entity'

const services = [AuthService, AuthRepo, LocalStrategy, JwtStrategy]

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ConfigModule, // Importa aqui no módulo local
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '12h' }
      })
    })
  ],
  controllers: [AuthController],
  providers: services
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoginValidationMiddleware)
      .forRoutes('auth/login', 'auth/policies')
  }
}
