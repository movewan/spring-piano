'use client'

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SCHOOLS, School, searchSchools, getSchoolType, SchoolType } from '@/lib/constants/schools'

interface SchoolAutocompleteProps {
  label?: string
  value: string
  onChange: (value: string, type: SchoolType) => void
  placeholder?: string
  error?: string
}

export default function SchoolAutocomplete({
  label,
  value,
  onChange,
  placeholder = '학교명을 입력하세요',
  error,
}: SchoolAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<School[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  useEffect(() => {
    if (inputValue) {
      const filtered = searchSchools(inputValue)
      setSuggestions(filtered)
    } else {
      setSuggestions([])
    }
    setHighlightedIndex(-1)
  }, [inputValue])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setIsOpen(true)

    // 직접 입력 시 타입 추론
    const type = getSchoolType(newValue)
    onChange(newValue, type)
  }

  const handleSelect = useCallback((school: School) => {
    setInputValue(school.name)
    onChange(school.name, school.type)
    setIsOpen(false)
    inputRef.current?.blur()
  }, [onChange])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown') {
        setIsOpen(true)
        setSuggestions(SCHOOLS.slice(0, 10))
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const handleFocus = () => {
    setIsOpen(true)
    if (!inputValue) {
      setSuggestions(SCHOOLS.slice(0, 10))
    }
  }

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => setIsOpen(false), 200)
  }

  return (
    <div className="relative w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}

      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`
          w-full px-4 py-3
          bg-white/60 backdrop-blur-sm
          border border-white/40
          rounded-xl
          text-gray-900 placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
          transition-all duration-200
          ${error ? 'border-red-400 focus:ring-red-400/50 focus:border-red-400' : ''}
        `}
        autoComplete="off"
      />

      <AnimatePresence>
        {isOpen && suggestions.length > 0 && (
          <motion.ul
            ref={listRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 max-h-60 overflow-y-auto"
          >
            {suggestions.map((school, index) => (
              <li
                key={school.name}
                onClick={() => handleSelect(school)}
                className={`
                  px-4 py-3 cursor-pointer transition-colors
                  ${index === highlightedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50'}
                  ${index === 0 ? 'rounded-t-xl' : ''}
                  ${index === suggestions.length - 1 ? 'rounded-b-xl' : ''}
                `}
              >
                <span className="font-medium">{school.name}</span>
                <span className="ml-2 text-xs text-gray-400">
                  {school.type === 'elementary' && '초등학교'}
                  {school.type === 'middle' && '중학교'}
                  {school.type === 'high' && '고등학교'}
                </span>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  )
}
