'use client'

import { useEffect, useState, Suspense, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { GlassCard, Button, Modal, TimelineItem, SectionHeader } from '@/components/ui'

interface Feedback {
  id: string
  month_year: string
  content: string
  video_url: string | null
  teacher: { name: string }
  student: { name: string }
  created_at: string
}

interface FeedbackGroup {
  month: string
  year: string
  label: string
  items: Feedback[]
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

  // Group feedback by month
  const groupedFeedback = useMemo(() => {
    const groups: FeedbackGroup[] = []
    const groupMap = new Map<string, Feedback[]>()

    feedback.forEach(fb => {
      const key = fb.month_year
      if (!groupMap.has(key)) {
        groupMap.set(key, [])
      }
      groupMap.get(key)!.push(fb)
    })

    // Sort by date (newest first)
    const sortedKeys = Array.from(groupMap.keys()).sort((a, b) => b.localeCompare(a))

    sortedKeys.forEach(key => {
      const [year, month] = key.split('-')
      groups.push({
        month: month,
        year: year,
        label: `${year}년 ${parseInt(month)}월`,
        items: groupMap.get(key)!
      })
    })

    return groups
  }, [feedback])

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">월간 피드백</h1>
          <p className="text-gray-500">선생님의 수업 피드백을 확인하세요</p>
        </div>

        {/* Feedback Timeline */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-24 mb-4" />
                <div className="h-32 bg-gray-100 rounded-xl" />
              </div>
            ))}
          </div>
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
          <div className="space-y-8">
            {groupedFeedback.map((group, groupIndex) => (
              <motion.div
                key={group.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.1 }}
              >
                {/* Month Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200" />
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <span className="text-2xl">📅</span>
                    {group.label}
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200" />
                </div>

                {/* Timeline Items */}
                <div className="mt-4">
                  {group.items.map((fb, index) => (
                    <TimelineItem
                      key={fb.id}
                      title={fb.student.name}
                      subtitle={`${fb.teacher.name} 선생님`}
                      content={fb.content}
                      videoUrl={fb.video_url}
                      badge={fb.video_url ? '영상' : undefined}
                      defaultExpanded={groupIndex === 0 && index === 0}
                    />
                  ))}
                </div>
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
