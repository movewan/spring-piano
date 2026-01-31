import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'

const BCRYPT_ROUNDS = 12

// PIN 해시 (bcrypt)
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_ROUNDS)
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash)
}

// SHA-256 해시 (전화번호 뒷4자리 검색용)
export function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

// 전화번호 뒷4자리 해시 생성
export function hashPhoneLast4(phone: string): string {
  const normalized = phone.replace(/[^0-9]/g, '')
  const last4 = normalized.slice(-4)
  return sha256(last4)
}
