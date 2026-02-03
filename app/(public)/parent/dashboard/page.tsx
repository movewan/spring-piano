'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { GlassCard, Button, SectionHeader, StatCard } from '@/components/ui'

interface Child {
  id: string
  name: string
  school: string | null
  grade: number | null
  video_folder_url: string | null
  product: { name: string } | null
  schedules: Array<{
    day_of_week: number
    start_time: string
    teacher: { name: string; color: string }
  }>
}

interface LatestFeedback {
  id: string
  month_year: string
  content: string
  student: { name: string }
  teacher: { name: string }
}

const dayNames = ['일', '월', '화', '수', '목', '금', '토']

export default function ParentDashboardPage() {
  const router = useRouter()
  const [children, setChildren] = useState<Child[]>([])
  const [latestFeedback, setLatestFeedback] = useState<LatestFeedback | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch children and latest feedback in parallel
        const [childrenRes, feedbackRes] = await Promise.all([
          fetch('/api/parent/children'),
          fetch('/api/parent/feedback?limit=1')
        ])

        const childrenData = await childrenRes.json()
        const feedbackData = await feedbackRes.json()

        if (childrenData.success) {
          setChildren(childrenData.data.children)
        } else {
          if (childrenRes.status === 401) {
            router.push('/parent/login')
          }
        }

        if (feedbackData.success && feedbackData.data.feedback.length > 0) {
          setLatestFeedback(feedbackData.data.feedback[0])
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  // Get first child with video URL for hero section
  const childWithVideo = children.find(c => c.video_folder_url)

  const formatMonthYear = (monthYear: string) => {
    const [year, month] = monthYear.split('-')
    return `${year}년 ${parseInt(month)}월`
  }

  const handleLogout = async () => {
    document.cookie = 'parent_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT'
    router.push('/parent/login')
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">학부모 포털</h1>
            <p className="text-gray-500">이화피아노의봄</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            로그아웃
          </Button>
        </div>

        {/* Video Hero Section */}
        {!loading && childWithVideo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <a
              href={childWithVideo.video_folder_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="block mb-6"
            >
              <GlassCard className="overflow-hidden p-0 hover:shadow-lg transition-shadow">
                <div className="relative h-40 bg-gradient-to-r from-red-400 via-orange-400 to-yellow-300">
                  <div className="absolute inset-0 bg-black/10" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-red-500 ml-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                    <span className="inline-block px-3 py-1 bg-white/90 rounded-full text-xs font-medium text-gray-700 mb-2">
                      매월 첫째 주 업데이트
                    </span>
                    <h2 className="text-xl font-bold text-white">이번 달 연주 영상</h2>
                    <p className="text-white/80 text-sm">우리 아이의 성장을 확인해보세요</p>
                  </div>
                </div>
              </GlassCard>
            </a>
          </motion.div>
        )}

        {/* Latest Feedback Preview */}
        {!loading && latestFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <SectionHeader
              title="최신 피드백"
              subtitle="선생님의 수업 평가"
              action={
                <Link href="/parent/feedback" className="text-sm text-primary font-medium">
                  전체 보기
                </Link>
              }
            />
            <Link href={`/parent/feedback?student=${children[0]?.id}`}>
              <GlassCard className="p-4 hover:bg-white/60 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                    {latestFeedback.student.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatMonthYear(latestFeedback.month_year)}
                  </span>
                </div>
                <p className="text-gray-700 text-sm line-clamp-2">{latestFeedback.content}</p>
                <p className="text-xs text-gray-400 mt-2">{latestFeedback.teacher.name} 선생님</p>
              </GlassCard>
            </Link>
          </motion.div>
        )}

        {/* Children Section */}
        {!loading && children.length > 0 && (
          <SectionHeader
            title="내 자녀"
            subtitle={`${children.length}명의 자녀가 등록되어 있습니다`}
            className="mt-6"
          />
        )}

        {/* Children Cards */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : children.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-gray-500">등록된 자녀가 없습니다</p>
            <p className="text-sm text-gray-400 mt-2">
              학원에 문의해주세요
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {children.map((child, index) => (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-bold text-lg">
                          {child.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h2 className="font-bold text-gray-900">{child.name}</h2>
                        <p className="text-sm text-gray-500">
                          {child.school && `${child.school} `}
                          {child.grade && `${child.grade}학년`}
                        </p>
                      </div>
                    </div>
                    {child.product && (
                      <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-full text-sm">
                        {child.product.name}
                      </span>
                    )}
                  </div>

                  {/* Schedule */}
                  {child.schedules.length > 0 && (
                    <div className="mb-4 p-3 bg-white/50 rounded-xl">
                      <p className="text-sm text-gray-500 mb-2">수업 일정</p>
                      <div className="flex flex-wrap gap-2">
                        {child.schedules.map((schedule, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-lg text-sm text-white"
                            style={{ backgroundColor: schedule.teacher.color }}
                          >
                            {dayNames[schedule.day_of_week]} {schedule.start_time.slice(0, 5)} ({schedule.teacher.name})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Video Folder Link */}
                  {child.video_folder_url && (
                    <div className="mb-4">
                      <a
                        href={child.video_folder_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100 hover:shadow-md transition-shadow"
                      >
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">연주 영상 보기</p>
                          <p className="text-xs text-gray-500">Google Drive 폴더</p>
                        </div>
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Link href={`/parent/attendance?student=${child.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        출석 현황
                      </Button>
                    </Link>
                    <Link href={`/parent/feedback?student=${child.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        피드백
                      </Button>
                    </Link>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-white/30 px-4 py-3">
        <div className="max-w-lg mx-auto flex justify-around">
          <Link href="/parent/dashboard" className="flex flex-col items-center text-primary">
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
          <Link href="/parent/feedback" className="flex flex-col items-center text-gray-500">
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
