import { DataSource } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { User } from '../../users/entities/user.entity'

export async function seedDefaultUser(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User)

  // Verifica se já existe um usuário com este email
  const existingUser = await userRepository.findOne({
    where: { email: 'user@example.com' }
  })

  if (existingUser) {
    console.log('Default user already exists')
    return
  }

  // Seed a basic user with a simple 8-character password (lowercase, uppercase, number, symbol)
  const plainPassword = 'Aa1234!@'
  const hashedPassword = await bcrypt.hash(plainPassword, 12)

  const defaultUser = userRepository.create({
    email: 'user@example.com',
    password: hashedPassword,
    firstName: 'Default',
    lastName: 'User'
  })

  await userRepository.save(defaultUser)
  console.log('Default user created successfully')
}
