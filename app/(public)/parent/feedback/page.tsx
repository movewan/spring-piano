'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GlassCard, Button, Modal } from '@/components/ui'

interface Feedback {
  id: string
  month_year: string
  content: string
  video_url: string | null
  teacher: { name: string }
  student: { name: string }
  created_at: string
}

function FeedbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const studentId = searchParams.get('student')

  const [feedback, setFeedback] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null)

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const params = new URLSearchParams()
        if (studentId) params.set('student_id', studentId)

        const res = await fetch(`/api/parent/feedback?${params}`)
        const data = await res.json()

        if (data.success) {
          setFeedback(data.data.feedback)
        } else if (res.status === 401) {
          router.push('/parent/login')
        }
      } catch (error) {
        console.error('Failed to fetch feedback:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFeedback()
  }, [studentId, router])

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-')
    return `${year}년 ${parseInt(month)}월`
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">월간 피드백</h1>
          <p className="text-gray-500">선생님의 수업 피드백을 확인하세요</p>
        </div>

        {/* Feedback List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : feedback.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500">아직 피드백이 없습니다</p>
            <p className="text-sm text-gray-400 mt-2">
              매월 선생님의 피드백이 업데이트됩니다
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {feedback.map((fb, index) => (
              <motion.div
                key={fb.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard
                  className="p-5 cursor-pointer"
                  hover
                  onClick={() => setSelectedFeedback(fb)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {formatMonthYear(fb.month_year)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {fb.student.name} · {fb.teacher.name} 선생님
                      </p>
                    </div>
                    {fb.video_url && (
                      <span className="px-2 py-1 bg-secondary/10 text-secondary rounded-full text-xs">
                        영상
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-2">{fb.content}</p>
                  <Button variant="ghost" size="sm" className="mt-3">
                    자세히 보기
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Feedback Detail Modal */}
      <Modal
        isOpen={!!selectedFeedback}
        onClose={() => setSelectedFeedback(null)}
        title={selectedFeedback ? formatMonthYear(selectedFeedback.month_year) : ''}
        size="lg"
      >
        {selectedFeedback && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                {selectedFeedback.student.name}
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                {selectedFeedback.teacher.name} 선생님
              </span>
            </div>

            {/* Video */}
            {selectedFeedback.video_url && (
              <div className="mb-4 rounded-xl overflow-hidden bg-black aspect-video">
                <video
                  src={selectedFeedback.video_url}
                  controls
                  className="w-full h-full"
                  poster=""
                />
              </div>
            )}

            {/* Content */}
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">
                {selectedFeedback.content}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-white/30 px-4 py-3">
        <div className="max-w-lg mx-auto flex justify-around">
          <Link href="/parent/dashboard" className="flex flex-col items-center text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">홈</span>
          </Link>
          <Link href="/parent/attendance" className="flex flex-col items-center text-gray-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1">출석</span>
          </Link>
          <Link href="/parent/feedback" className="flex flex-col items-center text-primary">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-xs mt-1">피드백</span>
          </Link>
        </div>
      </nav>
    </main>
  )
}

export default function ParentFeedbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <FeedbackContent />
    </Suspense>
  )
}
