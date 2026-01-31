'use client'

import { forwardRef, InputHTMLAttributes, ChangeEvent, useCallback } from 'react'
import { formatPhone, validatePhone } from '@/lib/utils/phone-format'

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string
  error?: string
  value: string
  onChange: (value: string) => void
  showValidation?: boolean
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label, error, value, onChange, showValidation = false, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const formatted = formatPhone(inputValue)
      onChange(formatted)
    }, [onChange])

    const isValid = value ? validatePhone(value) : true
    const showError = showValidation && value && !isValid

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type="tel"
            inputMode="numeric"
            value={value}
            onChange={handleChange}
            maxLength={13}
            className={`
              w-full px-4 py-3
              bg-white/60 backdrop-blur-sm
              border border-white/40
              rounded-xl
              text-gray-900 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
              transition-all duration-200
              ${(error || showError) ? 'border-red-400 focus:ring-red-400/50 focus:border-red-400' : ''}
              ${className}
            `}
            {...props}
          />
        </div>
        {(error || showError) && (
          <p className="mt-1 text-sm text-red-500">
            {error || '올바른 전화번호 형식이 아닙니다'}
          </p>
        )}
      </div>
    )
  }
)

PhoneInput.displayName = 'PhoneInput'

export default PhoneInput
