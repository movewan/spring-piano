'use client'

import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Button from '@/components/ui/Button'

interface UploadResult {
  success: boolean
  message: string
  batchId?: string
  fileType?: string
  stats?: {
    totalRows: number
    imported: number
    errors: number
  }
  errors?: { row: number; message: string }[]
}

interface ExcelUploadProps {
  onUploadComplete?: (result: UploadResult) => void
  className?: string
}

export default function ExcelUpload({ onUploadComplete, className = '' }: ExcelUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileType, setFileType] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      setSelectedFile(file)
      setResult(null)
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setResult(null)
    }
  }, [])

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      if (fileType) {
        formData.append('fileType', fileType)
      }

      const response = await fetch('/api/payhere/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        setResult({
          success: false,
          message: data.error || '업로드 실패',
          errors: data.errors
        })
      } else {
        setResult(data)
        onUploadComplete?.(data)
      }
    } catch (error) {
      setResult({
        success: false,
        message: '네트워크 오류가 발생했습니다'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setResult(null)
    setFileType('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 파일 선택 영역 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8
          flex flex-col items-center justify-center
          cursor-pointer transition-all duration-200
          ${isDragging
            ? 'border-primary bg-primary/10'
            : selectedFile
              ? 'border-green-400 bg-green-50'
              : 'border-gray-300 hover:border-primary hover:bg-gray-50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileSelect}
          className="hidden"
        />

        {selectedFile ? (
          <>
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-700">{selectedFile.name}</p>
            <p className="text-sm text-gray-500 mt-1">
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-600">
              {isDragging ? '여기에 놓으세요' : '파일을 드래그하거나 클릭하세요'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              xlsx, xls, csv 파일 지원 (최대 10MB)
            </p>
          </>
        )}
      </div>

      {/* 파일 타입 선택 (선택적) */}
      {selectedFile && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-gray-50 rounded-xl p-4"
        >
          <label className="block text-sm font-medium text-gray-700 mb-2">
            파일 유형 (자동 감지되지 않을 경우 선택)
          </label>
          <div className="flex gap-3">
            <label className="flex items-center">
              <input
                type="radio"
                name="fileType"
                value=""
                checked={fileType === ''}
                onChange={(e) => setFileType(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm">자동 감지</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="fileType"
                value="sales"
                checked={fileType === 'sales'}
                onChange={(e) => setFileType(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm">결제 내역</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="fileType"
                value="daily_summary"
                checked={fileType === 'daily_summary'}
                onChange={(e) => setFileType(e.target.value)}
                className="mr-2"
              />
              <span className="text-sm">기간별 집계</span>
            </label>
          </div>
        </motion.div>
      )}

      {/* 버튼 영역 */}
      {selectedFile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-3"
        >
          <Button
            variant="primary"
            onClick={handleUpload}
            loading={isUploading}
            disabled={isUploading}
            className="flex-1"
          >
            {isUploading ? '업로드 중...' : '업로드'}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isUploading}
          >
            취소
          </Button>
        </motion.div>
      )}

      {/* 결과 표시 */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-xl p-4 ${
              result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.success ? (
                <svg className="w-5 h-5 text-green-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <div className="flex-1">
                <p className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.message}
                </p>
                {result.stats && (
                  <p className="text-sm text-gray-600 mt-1">
                    총 {result.stats.totalRows}행 중 {result.stats.imported}건 저장됨
                    {result.stats.errors > 0 && ` (${result.stats.errors}건 오류)`}
                  </p>
                )}
                {result.errors && result.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-sm text-red-600 cursor-pointer">
                      오류 상세 ({result.errors.length}건)
                    </summary>
                    <ul className="mt-2 text-sm text-red-600 space-y-1">
                      {result.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>행 {err.row}: {err.message}</li>
                      ))}
                      {result.errors.length > 10 && (
                        <li>... 외 {result.errors.length - 10}건</li>
                      )}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
