import { MigrationInterface, QueryRunner } from 'typeorm'
import * as bcrypt from 'bcrypt'

export class SeedDefaultUser1730000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Verifica se já existe um usuário com este email
    const existingUser = await queryRunner.query(
      `SELECT id FROM users WHERE email = $1`,
      ['user@example.com']
    )

    if (existingUser.length > 0) {
      console.log('Default user already exists')
      return
    }

    // Seed a basic user with a simple 8-character password (lowercase, uppercase, number, symbol)
    const plainPassword = 'Aa1234!@'
    const hashedPassword = await bcrypt.hash(plainPassword, 12)

    await queryRunner.query(
      `INSERT INTO users (email, password, "firstName", "lastName", "createdAt", "updatedAt") 
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      ['user@example.com', hashedPassword, 'Default', 'User']
    )

    console.log('Default user created successfully')
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM users WHERE email = $1`, [
      'user@example.com'
    ])
  }
}
