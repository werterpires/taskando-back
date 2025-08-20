import { Injectable } from '@nestjs/common'
import * as crypto from 'crypto'

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc'
  private readonly key = crypto.scryptSync('minha-senha-secreta', 'salto', 32)
  private readonly ivLength = 16
  private readonly bufferFormat = 'hex'

  encrypt(text: string): string {
    const iv = crypto.randomBytes(this.ivLength)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
    return (
      iv.toString(this.bufferFormat) +
      ':' +
      encrypted.toString(this.bufferFormat)
    )
  }

  decrypt(encryptedText: string): string {
    if (!encryptedText.includes(':')) return encryptedText
    const [ivHex, encryptedHex] = encryptedText.split(':')
    const iv = Buffer.from(ivHex, this.bufferFormat)
    const encrypted = Buffer.from(encryptedHex, this.bufferFormat)
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv)
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ])
    return decrypted.toString()
  }
}
