import { Module } from '@nestjs/common'
import { APP_FILTER, APP_GUARD } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'
import { config } from 'dotenv'
import { DepartmentsModule } from './departments/departments.module'
import { OrganizationsMembersModule } from './organizations-members/organizations-members.module'
import { OrganizationsModule } from './organizations/organizations.module'
import { AuthModule } from './shared/auth/auth.module'
import { JwtAuthGuard } from './shared/auth/guards/jwt-auth.guard'
import { CustomErrorHandlerService } from './shared/custom-error-handler/custom-error-handler.service'
import { GlobalErrorsFilter } from './shared/custom-error-handler/global-errors.filter'
import { UtilsModuleModule } from './shared/utils-module/utils-module.module'
import { TeamsModule } from './teams/teams.module'
import { SquadsModule } from './squads/squads.module'
import { ActivityDomainsModule } from './activity-domains/activity-domains.module'
import { ProjectsModule } from './projects/projects.module'
import { StreamsModule } from './streams/streams.module'
import { UsersModule } from './users/users.module'

config()

const typeOrm = TypeOrmModule.forRoot({
  type: 'mysql',
  host: process.env.SQL_HOST,
  port: 3306,
  username: process.env.SQL_USER,
  password: process.env.SQL_PASS,
  database: process.env.SQL_DB,
  synchronize: true,
  entities: [__dirname + '/**/*.entity{.ts,.js}']
})

// const knex = KnexModule.forRoot(
//   {
//     config: {
//       client: 'mysql2',
//       connection: {
//         host: process.env.SQL_HOST,
//         user: process.env.SQL_USER,
//         password: process.env.SQL_PASS,
//         database: process.env.SQL_DB,
//         port: 3306,
//         typeCast: function (field, next) {
//           if (field.type === 'TINY' && field.length === 1) {
//             // retorna tipo booleano ou null
//             switch (field.string()) {
//               case null:
//               case undefined:
//               case '':
//               case 'null':
//               case 'NULL':
//                 return null
//               case '0':
//                 return false
//               case '1':
//                 return true
//             }
//           } else if (field.type === 'DATE' && field.length > 1) {
//             return field.string() // 1 = true, 0 = false
//           } else if (field.type === 'DATETIME' && field.length > 1) {
//             return field.string().substring(0, 10) // 1 = true, 0 = false
//           }
//           return next()
//         }
//       },
//       wrapIdentifier: (value, origImpl) => origImpl(toSnakeCase(value)),
//       postProcessResponse: (result) => {
//         if (Array.isArray(result)) {
//           return result.map((row) => camelcaseKeys(row, { deep: true }))
//         }
//         return camelcaseKeys(result, { deep: true })
//       }
//     }
//   },
//   'knexx'
// )

@Module({
  imports: [
    UtilsModuleModule,
    typeOrm,
    UsersModule,
    AuthModule,
    OrganizationsModule,
    OrganizationsMembersModule,
    DepartmentsModule,
    TeamsModule,
    SquadsModule,
    ActivityDomainsModule,
    ProjectsModule,
    StreamsModule
  ],
  controllers: [],
  providers: [
    CustomErrorHandlerService,
    { provide: APP_FILTER, useClass: GlobalErrorsFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard }
  ]
})
export class AppModule {}
