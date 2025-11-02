import { DataSource } from 'typeorm'
import { seedDefaultUser } from './user.seed'

export async function runSeeds(dataSource: DataSource): Promise<void> {
  try {
    console.log('Running seeds...')

    await seedDefaultUser(dataSource)

    console.log('All seeds completed successfully')
  } catch (error) {
    console.error('Error running seeds:', error)
    throw error
  }
}
