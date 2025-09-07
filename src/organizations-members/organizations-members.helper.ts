
import { Injectable } from '@nestjs/common'

@Injectable()
export class OrganizationsMembersHelper {
  generateInviteCode(): string {
    // Gerar 22 caracteres aleatórios
    const randomChars = this.generateRandomString(22)
    
    // Gerar timestamp em base64 (8 caracteres)
    const timestamp = new Date().getTime().toString()
    const timestampBase64 = Buffer.from(timestamp).toString('base64').slice(0, 8)
    
    // Combinar para formar 30 caracteres
    return randomChars + timestampBase64
  }

  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  extractTimestampFromInviteCode(inviteCode: string): Date {
    // Pegar os últimos 8 caracteres (timestamp em base64)
    const timestampBase64 = inviteCode.slice(-8)
    const timestamp = Buffer.from(timestampBase64, 'base64').toString()
    return new Date(parseInt(timestamp))
  }
}
