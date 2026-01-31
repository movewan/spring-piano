'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import Header from '@/components/admin/Header'
import { GlassCard, Button, Input } from '@/components/ui'

interface Student {
  id: string
  name: string
  phone: string
  is_active: boolean
  product?: { name: string }
  schedules?: Array<{
    day_of_week: number
    start_time: string
    teacher: { name: string; color: string }
  }>
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const dayNames = ['일', '월', '화', '수', '목', '금', '토']

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        is_active: 'true',
      })
      if (search) params.set('search', search)

      const res = await fetch(`/api/students?${params}`)
      const data = await res.json()

      if (data.success) {
        setStudents(data.data.students)
        setPagination(data.data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch students:', error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, pagination.limit, search])

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchStudents()
    }, 300)

    return () => clearTimeout(debounce)
  }, [fetchStudents])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  return (
    <AdminLayout>
      <Header title="원생 관리" subtitle={`총 ${pagination.total}명의 원생`} />

      <div className="flex-1 overflow-y-auto p-8">
        {/* Search & Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="w-80">
            <Input
              placeholder="원생 이름으로 검색..."
              value={search}
              onChange={handleSearch}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <Link href="/students/new">
            <Button variant="primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              원생 등록
            </Button>
          </Link>
        </div>

        {/* Students List */}
        <GlassCard className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">로딩 중...</div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {search ? '검색 결과가 없습니다' : '등록된 원생이 없습니다'}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">이름</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">연락처</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">수강과정</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">수업일</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((student, index) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-white/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-bold">
                            {student.name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{student.phone}</td>
                    <td className="px-6 py-4">
                      {student.product ? (
                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                          {student.product.name}
                        </span>
                      ) : (
                        <span className="text-gray-400">미지정</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {student.schedules?.map((schedule, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 rounded text-xs text-white"
                            style={{ backgroundColor: schedule.teacher.color }}
                          >
                            {dayNames[schedule.day_of_week]} {schedule.start_time.slice(0, 5)}
                          </span>
                        ))}
                        {!student.schedules?.length && (
                          <span className="text-gray-400 text-sm">미등록</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/students/${student.id}`}>
                        <Button variant="ghost" size="sm">
                          상세보기
                        </Button>
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </GlassCard>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            >
              이전
            </Button>
            <span className="flex items-center px-4 text-gray-600">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            >
              다음
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
