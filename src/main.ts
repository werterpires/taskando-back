import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface'
import { ValidationPipe } from '@nestjs/common'
import { CustomLoggerService } from './shared/utils-module/custom-logger/custom-logger.service'
import { DataSource } from 'typeorm'
import { runSeeds } from './database/seeds'

const corsOptions: CorsOptions = {
  origin: 'http://localhost:4200'
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    cors: corsOptions
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  )
  app.useLogger(new CustomLoggerService())

  // Run seeds on startup (only in development)
  if (process.env.NODE_ENV !== 'production') {
    try {
      const dataSource = app.get(DataSource)
      await runSeeds(dataSource)
    } catch (error) {
      console.error('Seed error:', error)
    }
  }

  await app.listen(process.env.PORT ?? 3000)
}

bootstrap().catch(console.error)
