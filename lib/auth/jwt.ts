import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export interface ParentJwtPayload {
  parentId: string
  familyId: string | null
  name: string
  iat: number
  exp: number
}

export function signParentToken(payload: Omit<ParentJwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyParentToken(token: string): ParentJwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as ParentJwtPayload
  } catch {
    return null
  }
}
