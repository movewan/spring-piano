'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import Header from '@/components/admin/Header'
import { GlassCard, Button, Input, PhoneInput, Select, SchoolAutocomplete, GradeSelect } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { SchoolType, getSchoolType } from '@/lib/constants/schools'

interface Product {
  id: string
  name: string
  price: number
}

interface StudentData {
  id: string
  name: string
  phone: string | null
  birth_date: string | null
  school: string | null
  grade: number | null
  product_id: string | null
  notes: string | null
}

export default function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [schoolType, setSchoolType] = useState<SchoolType>('etc')
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    birth_date: '',
    school: '',
    grade: '',
    product_id: '',
    notes: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // 수강 과정 목록
        const supabase = createClient()
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, price')
          .eq('is_active', true)
        if (productsData) setProducts(productsData)

        // 원생 정보
        const res = await fetch(`/api/students/${id}`)
        const data = await res.json()
        if (data.success) {
          const student: StudentData = data.data.student
          setFormData({
            name: student.name || '',
            phone: student.phone || '',
            birth_date: student.birth_date || '',
            school: student.school || '',
            grade: student.grade?.toString() || '',
            product_id: student.product_id || '',
            notes: student.notes || '',
          })
          if (student.school) {
            setSchoolType(getSchoolType(student.school))
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setError('데이터를 불러오는데 실패했습니다')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSchoolChange = (school: string, type: SchoolType) => {
    setFormData((prev) => ({ ...prev, school, grade: '' }))
    setSchoolType(type)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          birth_date: formData.birth_date || null,
          school: formData.school || null,
          grade: formData.grade ? parseInt(formData.grade) : null,
          product_id: formData.product_id || null,
          notes: formData.notes || null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        router.push(`/students/${id}`)
      } else {
        setError(data.error || '수정에 실패했습니다')
      }
    } catch {
      setError('서버 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <Header title="원생 정보 수정" subtitle="정보를 불러오는 중..." />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <Header title="원생 정보 수정" subtitle={formData.name} />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <h2 className="text-xl font-bold text-gray-900">기본 정보</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="이름 *"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="홍길동"
                    required
                  />
                  <PhoneInput
                    label="연락처 *"
                    value={formData.phone}
                    onChange={(value) => handleInputChange('phone', value)}
                    placeholder="010-1234-5678"
                    showValidation
                  />
                  <Input
                    label="생년월일"
                    type="date"
                    value={formData.birth_date}
                    onChange={(e) => handleInputChange('birth_date', e.target.value)}
                  />
                  <SchoolAutocomplete
                    label="학교"
                    value={formData.school}
                    onChange={handleSchoolChange}
                    placeholder="학교명을 입력하세요"
                  />
                  <GradeSelect
                    label="학년"
                    value={formData.grade}
                    onChange={(value) => handleInputChange('grade', value)}
                    schoolType={schoolType}
                  />
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">수강 정보</h2>
                  <Select
                    label="수강 과정"
                    value={formData.product_id}
                    onChange={(e) => handleInputChange('product_id', e.target.value)}
                    options={products.map((p) => ({
                      value: p.id,
                      label: `${p.name} (${p.price.toLocaleString()}원)`,
                    }))}
                    placeholder="수강 과정 선택"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    메모
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="특이사항 등을 입력하세요"
                    className="w-full px-4 py-3 bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200 min-h-[100px]"
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="flex justify-between pt-6 border-t border-gray-100">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => router.back()}
                  >
                    취소
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={saving}
                    disabled={!formData.name || !formData.phone}
                  >
                    저장
                  </Button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </AdminLayout>
  )
}
