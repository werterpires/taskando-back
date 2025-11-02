#!/usr/bin/env ts-node
import { DataSource } from 'typeorm'
import { runSeeds } from '../src/database/seeds'
import { User } from '../src/users/entities/user.entity'
import { Organization } from '../src/organizations/entities/organization.entity'
import { OrganizationMember } from '../src/organizations-members/entities/organization-member.entity'
import { Department } from '../src/departments/entities/department.entity'
import { DepartmentMember } from '../src/departments/entities/department-member.entity'
import { Team } from '../src/teams/entities/team.entity'
import { TeamMember } from '../src/teams/entities/team-member.entity'

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'taskando',
  entities: [
    User,
    Organization,
    OrganizationMember,
    Department,
    DepartmentMember,
    Team,
    TeamMember
  ],
  synchronize: false
})

async function main() {
  try {
    console.log('Connecting to database...')
    await AppDataSource.initialize()

    console.log('Running seeds...')
    await runSeeds(AppDataSource)

    console.log('Seeds completed successfully!')
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await AppDataSource.destroy()
  }
}

main().catch(console.error)
