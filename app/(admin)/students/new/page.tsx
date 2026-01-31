'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import AdminLayout from '@/components/admin/AdminLayout'
import Header from '@/components/admin/Header'
import { GlassCard, Button, Input, Select } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'

interface Product {
  id: string
  name: string
  price: number
}

type Step = 'consent' | 'basic' | 'parent' | 'course'

export default function NewStudentPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('consent')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    // 기본 정보
    name: '',
    phone: '',
    birth_date: '',
    school: '',
    grade: '',
    // 보호자 정보
    parent_name: '',
    parent_phone: '',
    parent_birth_date: '',
    parent_relationship: '보호자',
    // 수강 정보
    product_id: '',
    notes: '',
    // 동의
    consent_signed: false,
  })

  useEffect(() => {
    const fetchProducts = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('products')
        .select('id, name, price')
        .eq('is_active', true)

      if (data) setProducts(data)
    }
    fetchProducts()
  }, [])

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/students/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          birth_date: formData.birth_date || null,
          school: formData.school || null,
          grade: formData.grade ? parseInt(formData.grade) : null,
          product_id: formData.product_id || null,
          notes: formData.notes || null,
          consent_signed: formData.consent_signed,
          parent: formData.parent_name
            ? {
                name: formData.parent_name,
                phone: formData.parent_phone,
                birth_date: formData.parent_birth_date || null,
                relationship: formData.parent_relationship,
              }
            : null,
        }),
      })

      const data = await res.json()

      if (data.success) {
        router.push('/students')
      } else {
        setError(data.error || '원생 등록에 실패했습니다')
      }
    } catch {
      setError('서버 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { id: 'consent', label: '개인정보 동의' },
    { id: 'basic', label: '기본 정보' },
    { id: 'parent', label: '보호자 정보' },
    { id: 'course', label: '수강 정보' },
  ]

  const currentStepIndex = steps.findIndex((s) => s.id === step)

  const canProceed = () => {
    switch (step) {
      case 'consent':
        return formData.consent_signed
      case 'basic':
        return formData.name && formData.phone
      case 'parent':
        return true // 선택사항
      case 'course':
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    const nextIndex = currentStepIndex + 1
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex].id as Step)
    }
  }

  const prevStep = () => {
    const prevIndex = currentStepIndex - 1
    if (prevIndex >= 0) {
      setStep(steps[prevIndex].id as Step)
    }
  }

  return (
    <AdminLayout>
      <Header title="원생 등록" subtitle="새로운 원생을 등록합니다" />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((s, index) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-bold
                    ${index <= currentStepIndex
                      ? 'bg-primary text-white'
                      : 'bg-gray-200 text-gray-500'
                    }
                  `}
                >
                  {index + 1}
                </div>
                <span
                  className={`ml-2 text-sm hidden sm:block ${
                    index <= currentStepIndex ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {s.label}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 sm:w-16 h-1 mx-2 rounded ${
                      index < currentStepIndex ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Form Steps */}
          <GlassCard className="p-8">
            <AnimatePresence mode="wait">
              {step === 'consent' && (
                <motion.div
                  key="consent"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold text-gray-900">개인정보 수집 및 이용 동의</h2>
                  <div className="bg-gray-50 rounded-xl p-4 h-48 overflow-y-auto text-sm text-gray-600">
                    <p className="font-medium mb-2">1. 수집하는 개인정보 항목</p>
                    <p className="mb-4">- 원생: 이름, 연락처, 생년월일, 학교, 학년<br />- 보호자: 이름, 연락처, 생년월일</p>
                    <p className="font-medium mb-2">2. 개인정보 수집 및 이용 목적</p>
                    <p className="mb-4">- 원생 관리 및 수업 진행<br />- 출결 관리 및 학부모 연락<br />- 수강료 결제 및 수납 관리</p>
                    <p className="font-medium mb-2">3. 개인정보 보유 및 이용 기간</p>
                    <p className="mb-4">- 수강 종료 후 1년간 보관 후 파기</p>
                    <p className="font-medium mb-2">4. 동의 거부권 및 불이익</p>
                    <p>- 동의를 거부할 권리가 있으며, 거부 시 수강 등록이 제한됩니다.</p>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.consent_signed}
                      onChange={(e) => handleInputChange('consent_signed', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-gray-900">
                      위 내용을 확인하였으며 개인정보 수집 및 이용에 동의합니다.
                    </span>
                  </label>
                </motion.div>
              )}

              {step === 'basic' && (
                <motion.div
                  key="basic"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold text-gray-900">원생 기본 정보</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="이름 *"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="홍길동"
                    />
                    <Input
                      label="연락처 *"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="010-1234-5678"
                    />
                    <Input
                      label="생년월일"
                      type="date"
                      value={formData.birth_date}
                      onChange={(e) => handleInputChange('birth_date', e.target.value)}
                    />
                    <Input
                      label="학교"
                      value={formData.school}
                      onChange={(e) => handleInputChange('school', e.target.value)}
                      placeholder="OO초등학교"
                    />
                    <Select
                      label="학년"
                      value={formData.grade}
                      onChange={(e) => handleInputChange('grade', e.target.value)}
                      options={[
                        { value: '1', label: '1학년' },
                        { value: '2', label: '2학년' },
                        { value: '3', label: '3학년' },
                        { value: '4', label: '4학년' },
                        { value: '5', label: '5학년' },
                        { value: '6', label: '6학년' },
                        { value: '7', label: '중1' },
                        { value: '8', label: '중2' },
                        { value: '9', label: '중3' },
                        { value: '10', label: '고1' },
                        { value: '11', label: '고2' },
                        { value: '12', label: '고3' },
                      ]}
                      placeholder="학년 선택"
                    />
                  </div>
                </motion.div>
              )}

              {step === 'parent' && (
                <motion.div
                  key="parent"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold text-gray-900">보호자 정보</h2>
                  <p className="text-sm text-gray-500">학부모 포털 로그인에 사용됩니다 (선택사항)</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="보호자 성함"
                      value={formData.parent_name}
                      onChange={(e) => handleInputChange('parent_name', e.target.value)}
                      placeholder="홍부모"
                    />
                    <Input
                      label="보호자 연락처"
                      value={formData.parent_phone}
                      onChange={(e) => handleInputChange('parent_phone', e.target.value)}
                      placeholder="010-9876-5432"
                    />
                    <Input
                      label="보호자 생년월일"
                      type="date"
                      value={formData.parent_birth_date}
                      onChange={(e) => handleInputChange('parent_birth_date', e.target.value)}
                    />
                    <Select
                      label="관계"
                      value={formData.parent_relationship}
                      onChange={(e) => handleInputChange('parent_relationship', e.target.value)}
                      options={[
                        { value: '보호자', label: '보호자' },
                        { value: '부', label: '아버지' },
                        { value: '모', label: '어머니' },
                        { value: '조부', label: '할아버지' },
                        { value: '조모', label: '할머니' },
                      ]}
                    />
                  </div>
                </motion.div>
              )}

              {step === 'course' && (
                <motion.div
                  key="course"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <h2 className="text-xl font-bold text-gray-900">수강 정보</h2>
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
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm"
              >
                {error}
              </motion.div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
              {currentStepIndex > 0 ? (
                <Button variant="ghost" onClick={prevStep}>
                  이전
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => router.back()}>
                  취소
                </Button>
              )}

              {currentStepIndex < steps.length - 1 ? (
                <Button
                  variant="primary"
                  onClick={nextStep}
                  disabled={!canProceed()}
                >
                  다음
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  loading={loading}
                  disabled={!canProceed()}
                >
                  등록 완료
                </Button>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </AdminLayout>
  )
}
