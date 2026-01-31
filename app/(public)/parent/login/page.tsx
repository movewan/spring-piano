'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard, Button, Input } from '@/components/ui'

type Step = 'phone' | 'verify' | 'pin' | 'set_pin'

export default function ParentLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('phone')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [pin, setPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [parentId, setParentId] = useState('')
  const [parentName, setParentName] = useState('')

  const handlePhoneSubmit = async () => {
    if (!phone || phone.length < 4) {
      setError('전화번호를 입력해주세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/parent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })

      const data = await res.json()

      if (data.success) {
        if (data.data.needs_pin) {
          setParentId(data.data.parent_id)
          setStep('pin')
        } else if (data.data.needs_pin_setup) {
          setParentId(data.data.parent_id)
          setParentName(data.data.parent_name)
          // 최초 로그인 - 이름/생년월일 필요
          setStep('verify')
        } else {
          // 로그인 성공
          router.push('/parent/dashboard')
          router.refresh()
        }
      } else {
        if (res.status === 404) {
          // 등록된 학부모 없음 - 이름/생년월일로 확인 필요
          setStep('verify')
        } else {
          setError(data.error || '로그인에 실패했습니다')
        }
      }
    } catch {
      setError('서버 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!name || !birthDate) {
      setError('이름과 생년월일을 입력해주세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/parent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, birth_date: birthDate }),
      })

      const data = await res.json()

      if (data.success) {
        if (data.data.needs_pin) {
          setParentId(data.data.parent_id)
          setStep('pin')
        } else if (data.data.needs_pin_setup) {
          setParentId(data.data.parent_id)
          setParentName(data.data.parent_name)
          setStep('set_pin')
        }
      } else {
        setError(data.error || '인증에 실패했습니다')
      }
    } catch {
      setError('서버 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handlePinSubmit = async () => {
    if (!pin || pin.length < 4) {
      setError('PIN을 입력해주세요')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/parent/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      })

      const data = await res.json()

      if (data.success) {
        router.push('/parent/dashboard')
        router.refresh()
      } else {
        setError(data.error || 'PIN이 올바르지 않습니다')
      }
    } catch {
      setError('서버 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleSetPin = async () => {
    if (newPin !== confirmPin) {
      setError('PIN이 일치하지 않습니다')
      return
    }

    if (!/^\d{4,6}$/.test(newPin)) {
      setError('PIN은 4-6자리 숫자여야 합니다')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/parent/set-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: parentId, pin: newPin }),
      })

      const data = await res.json()

      if (data.success) {
        router.push('/parent/dashboard')
        router.refresh()
      } else {
        setError(data.error || 'PIN 설정에 실패했습니다')
      }
    } catch {
      setError('서버 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">학부모 포털</h1>
          <p className="text-gray-600">이화피아노의봄</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Step 1: Phone */}
          {step === 'phone' && (
            <motion.div
              key="phone"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <GlassCard className="p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">전화번호 입력</h2>
                <Input
                  label="전화번호"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  }
                />

                {error && (
                  <p className="mt-2 text-sm text-red-500">{error}</p>
                )}

                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full mt-6"
                  onClick={handlePhoneSubmit}
                  loading={loading}
                >
                  다음
                </Button>
              </GlassCard>
            </motion.div>
          )}

          {/* Step 2: Verify (최초 로그인) */}
          {step === 'verify' && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <GlassCard className="p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-2">본인 확인</h2>
                <p className="text-gray-500 mb-6">최초 로그인 시 본인 확인이 필요합니다</p>

                <div className="space-y-4">
                  <Input
                    label="이름"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                  />
                  <Input
                    label="생년월일"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                </div>

                {error && (
                  <p className="mt-2 text-sm text-red-500">{error}</p>
                )}

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => setStep('phone')}
                  >
                    이전
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex-1"
                    onClick={handleVerify}
                    loading={loading}
                  >
                    확인
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Step 3: PIN 입력 */}
          {step === 'pin' && (
            <motion.div
              key="pin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <GlassCard className="p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-6">PIN 입력</h2>

                <Input
                  label="PIN (4-6자리)"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  maxLength={6}
                />

                {error && (
                  <p className="mt-2 text-sm text-red-500">{error}</p>
                )}

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => setStep('phone')}
                  >
                    이전
                  </Button>
                  <Button
                    variant="secondary"
                    size="lg"
                    className="flex-1"
                    onClick={handlePinSubmit}
                    loading={loading}
                  >
                    로그인
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Step 4: PIN 설정 */}
          {step === 'set_pin' && (
            <motion.div
              key="set_pin"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <GlassCard className="p-8">
                <h2 className="text-xl font-bold text-gray-900 mb-2">PIN 설정</h2>
                <p className="text-gray-500 mb-6">
                  {parentName}님, 다음 로그인에 사용할 PIN을 설정해주세요
                </p>

                <div className="space-y-4">
                  <Input
                    label="새 PIN (4-6자리)"
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="••••"
                    maxLength={6}
                  />
                  <Input
                    label="PIN 확인"
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="••••"
                    maxLength={6}
                  />
                </div>

                {error && (
                  <p className="mt-2 text-sm text-red-500">{error}</p>
                )}

                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full mt-6"
                  onClick={handleSetPin}
                  loading={loading}
                >
                  PIN 설정 완료
                </Button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-6"
        >
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            메인으로 돌아가기
          </Link>
        </motion.div>
      </div>
    </main>
  )
}
