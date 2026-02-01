'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard, Button } from '@/components/ui'

const MUSIC_QUOTES = [
  { quote: "음악은 영혼의 언어이다.", author: "베토벤" },
  { quote: "음악이 없다면 인생은 실수일 것이다.", author: "베토벤" },
  { quote: "단순함은 궁극의 정교함이다.", author: "쇼팽" },
  { quote: "피아노 앞에 앉으면 세상에서 가장 행복한 사람이 됩니다.", author: "쇼팽" },
  { quote: "음악은 어떤 지혜나 철학보다 높은 계시이다.", author: "베토벤" },
  { quote: "마음에서 우러나온 음악은 다시 마음으로 향한다.", author: "베토벤" },
  { quote: "음악은 사랑의 음식이다.", author: "모차르트" },
  { quote: "멜로디는 음악의 본질이다.", author: "모차르트" },
  { quote: "음악은 말로 표현할 수 없는 것을 표현한다.", author: "슈만" },
  { quote: "음악을 사랑하지 않는 사람은 인간이라 할 수 없다.", author: "브람스" },
]

interface Student {
  id: string
  name: string
  product_name: string | null
}

type Step = 'input' | 'select' | 'success' | 'error'

export default function KioskPage() {
  const [step, setStep] = useState<Step>('input')
  const [digits, setDigits] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [checkedInStudent, setCheckedInStudent] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const randomQuote = useMemo(() => {
    return MUSIC_QUOTES[Math.floor(Math.random() * MUSIC_QUOTES.length)]
  }, [])

  const handleDigitPress = (digit: string) => {
    if (digits.length < 4) {
      setDigits((prev) => prev + digit)
    }
  }

  const handleDelete = () => {
    setDigits((prev) => prev.slice(0, -1))
  }

  const handleClear = () => {
    setDigits('')
  }

  const handleSearch = async () => {
    if (digits.length !== 4) return

    setLoading(true)
    try {
      const res = await fetch('/api/kiosk/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ last4digits: digits }),
      })

      const data = await res.json()

      if (data.success) {
        if (data.data.students.length === 0) {
          setErrorMessage('등록된 학생을 찾을 수 없습니다')
          setStep('error')
        } else if (data.data.students.length === 1) {
          // 학생이 1명이면 바로 출석
          await handleCheckin(data.data.students[0])
        } else {
          // 여러 명이면 선택 화면
          setStudents(data.data.students)
          setStep('select')
        }
      } else {
        setErrorMessage(data.error || '검색 중 오류가 발생했습니다')
        setStep('error')
      }
    } catch {
      setErrorMessage('서버 오류가 발생했습니다')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckin = async (student: Student) => {
    setLoading(true)
    try {
      const res = await fetch('/api/kiosk/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: student.id }),
      })

      const data = await res.json()

      if (data.success) {
        setCheckedInStudent(student.name)
        setStep('success')

        // 3초 후 초기화
        setTimeout(() => {
          resetState()
        }, 3000)
      } else {
        setErrorMessage(data.error || '출석 체크 중 오류가 발생했습니다')
        setStep('error')
      }
    } catch {
      setErrorMessage('서버 오류가 발생했습니다')
      setStep('error')
    } finally {
      setLoading(false)
    }
  }

  const resetState = () => {
    setStep('input')
    setDigits('')
    setStudents([])
    setCheckedInStudent('')
    setErrorMessage('')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            <span className="text-primary">이화피아노의봄</span>음악학원
          </h1>
          <p className="text-gray-600">오늘도 즐거운 음악시간 🎵</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Input Step */}
          {step === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard className="p-8">
                <p className="text-center text-gray-600 mb-6">부모님 전화번호 뒷 4자리를 입력하세요</p>

                {/* Display */}
                <div className="flex justify-center gap-3 mb-8">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`
                        w-16 h-20 rounded-xl flex items-center justify-center
                        text-3xl font-bold transition-all
                        ${digits[i]
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-gray-300'
                        }
                      `}
                    >
                      {digits[i] || '•'}
                    </div>
                  ))}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-3">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((key) => (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (key === 'C') handleClear()
                        else if (key === '⌫') handleDelete()
                        else handleDigitPress(key)
                      }}
                      className={`
                        h-16 rounded-xl text-xl font-bold transition-all
                        ${key === 'C' || key === '⌫'
                          ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                          : 'bg-white/60 text-gray-800 hover:bg-white/80 shadow-md'
                        }
                      `}
                    >
                      {key}
                    </motion.button>
                  ))}
                </div>

                {/* Submit Button */}
                <Button
                  variant="primary"
                  size="xl"
                  className="w-full mt-6"
                  onClick={handleSearch}
                  loading={loading}
                  disabled={digits.length !== 4}
                >
                  즐거운 피아노 수업!
                </Button>
              </GlassCard>
            </motion.div>
          )}

          {/* Select Step */}
          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard className="p-8">
                <p className="text-center text-gray-600 mb-6">본인을 선택하세요</p>

                <div className="space-y-3">
                  {students.map((student) => (
                    <motion.button
                      key={student.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleCheckin(student)}
                      disabled={loading}
                      className="w-full p-4 bg-white/60 hover:bg-white/80 rounded-xl text-left transition-all shadow-md"
                    >
                      <p className="font-bold text-gray-900 text-lg">{student.name}</p>
                      {student.product_name && (
                        <p className="text-sm text-gray-500">{student.product_name}</p>
                      )}
                    </motion.button>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full mt-6"
                  onClick={resetState}
                >
                  취소
                </Button>
              </GlassCard>
            </motion.div>
          )}

          {/* Success Step */}
          {step === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                  className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center"
                >
                  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">출석 완료!</h2>
                <p className="text-xl text-primary font-medium">{checkedInStudent}님</p>
                <p className="text-gray-500 mt-2">좋은 하루 되세요 :)</p>
              </GlassCard>
            </motion.div>
          )}

          {/* Error Step */}
          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <GlassCard className="p-8 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 10 }}
                  className="w-24 h-24 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center"
                >
                  <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">오류</h2>
                <p className="text-gray-600">{errorMessage}</p>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mt-6"
                  onClick={resetState}
                >
                  다시 시도
                </Button>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-sm text-gray-400 mt-8"
        >
          "{randomQuote.quote}" - {randomQuote.author}
        </motion.p>
      </div>
    </main>
  )
}
