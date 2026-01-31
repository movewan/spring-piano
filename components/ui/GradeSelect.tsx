'use client'

import { useMemo } from 'react'
import { SchoolType, GRADES_BY_TYPE } from '@/lib/constants/schools'

interface GradeSelectProps {
  label?: string
  value: string
  onChange: (value: string) => void
  schoolType?: SchoolType
  error?: string
}

export default function GradeSelect({
  label,
  value,
  onChange,
  schoolType,
  error,
}: GradeSelectProps) {
  const options = useMemo(() => {
    if (schoolType && schoolType !== 'etc') {
      return GRADES_BY_TYPE[schoolType]
    }
    return GRADES_BY_TYPE.etc
  }, [schoolType])

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}

      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`
          w-full px-4 py-3
          bg-white/60 backdrop-blur-sm
          border border-white/40
          rounded-xl
          text-gray-900
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
          transition-all duration-200
          appearance-none
          bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236B7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')]
          bg-[length:1.5rem_1.5rem]
          bg-[right_0.5rem_center]
          bg-no-repeat
          pr-10
          ${error ? 'border-red-400 focus:ring-red-400/50 focus:border-red-400' : ''}
        `}
      >
        <option value="">학년 선택</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
