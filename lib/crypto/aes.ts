import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key) {
    throw new Error('ENCRYPTION_KEY is not set')
  }
  // hex 문자열을 Buffer로 변환 (64 hex chars = 32 bytes)
  return Buffer.from(key, 'hex')
}

export function encrypt(text: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // IV + AuthTag + EncryptedData를 합쳐서 반환
  return iv.toString('hex') + authTag.toString('hex') + encrypted
}

export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey()

  // IV (24 hex chars = 12 bytes), AuthTag (32 hex chars = 16 bytes), Data
  const iv = Buffer.from(encryptedText.slice(0, IV_LENGTH * 2), 'hex')
  const authTag = Buffer.from(encryptedText.slice(IV_LENGTH * 2, IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2), 'hex')
  const encrypted = encryptedText.slice(IV_LENGTH * 2 + AUTH_TAG_LENGTH * 2)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// 전화번호 형식 정규화 (하이픈 제거)
export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

// 암호화된 전화번호 저장
export function encryptPhone(phone: string): string {
  return encrypt(normalizePhone(phone))
}

// 복호화된 전화번호 조회
export function decryptPhone(encryptedPhone: string): string {
  const phone = decrypt(encryptedPhone)
  // 010-1234-5678 형식으로 반환
  if (phone.length === 11) {
    return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`
  }
  return phone
}
