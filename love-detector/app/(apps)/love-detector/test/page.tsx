'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MobileWrapper from '@/components/MobileWrapper'
import StatusBar from '@/components/StatusBar'
import { QUESTIONS, type Question, type Category, type Difficulty } from '@/lib/questions'

interface SetupConfig {
  mode: 'ta' | 'self'
  nickname: string
  count: number
  categories: Category[]
  difficulty: Difficulty | 'all'
}

interface Answer {
  questionId: number
  questionText: string
  category: string
  difficulty: string
  selectedOptionIndex: number
  selectedOptionText: string
  score: number
}

const OPTION_LABELS = ['A', 'B', 'C', 'D']

export default function TestPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [nickname, setNickname] = useState('TA')

  useEffect(() => {
    const raw = localStorage.getItem('ld_setup')
    const config: SetupConfig = raw
      ? JSON.parse(raw)
      : { mode: 'ta', nickname: '', count: 5, categories: ['忠诚度', '感情深度'], difficulty: '温和' }

    setNickname(config.nickname || 'TA')

    let pool = QUESTIONS.filter(q => config.categories.includes(q.category))
    if (config.difficulty !== 'all') {
      pool = pool.filter(q => q.difficulty === config.difficulty)
    }
    if (pool.length === 0) pool = QUESTIONS

    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    setQuestions(shuffled.slice(0, Math.min(config.count, shuffled.length)))
  }, [])

  const currentQuestion = questions[currentIndex]
  const total = questions.length
  const progress = total > 0 ? ((currentIndex) / total) * 100 : 0

  function handleSelectOption(optionIndex: number) {
    setSelectedOption(optionIndex)
  }

  function handleNext() {
    if (selectedOption === null || !currentQuestion) return

    const option = currentQuestion.options[selectedOption]
    const newAnswer: Answer = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.text,
      category: currentQuestion.category,
      difficulty: currentQuestion.difficulty,
      selectedOptionIndex: selectedOption,
      selectedOptionText: option.text,
      score: option.score,
    }

    const newAnswers = [...answers, newAnswer]

    if (currentIndex + 1 >= total) {
      // Save and go to result
      localStorage.setItem('ld_answers', JSON.stringify(newAnswers))

      // Save history
      const setupRaw = localStorage.getItem('ld_setup')
      const setup = setupRaw ? JSON.parse(setupRaw) : { nickname: 'TA' }
      const historyRaw = localStorage.getItem('ld_history')
      const history = historyRaw ? JSON.parse(historyRaw) : []
      const newEntry = {
        date: new Date().toISOString(),
        answers: newAnswers,
        nickname: setup.nickname || 'TA',
      }
      const updatedHistory = [newEntry, ...history].slice(0, 5)
      localStorage.setItem('ld_history', JSON.stringify(updatedHistory))

      router.push('/love-detector/result')
    } else {
      setAnswers(newAnswers)
      setCurrentIndex(currentIndex + 1)
      setSelectedOption(null)
    }
  }

  if (!currentQuestion) {
    return (
      <MobileWrapper>
        <div className="flex flex-col min-h-screen bg-white items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileWrapper>
    )
  }

  const difficultyColors: Record<string, string> = {
    '温和': 'bg-green-100 text-green-700',
    '犀利': 'bg-orange-100 text-orange-700',
    '灵魂拷问': 'bg-red-100 text-red-700',
  }
  const categoryColors: Record<string, string> = {
    '忠诚度': 'bg-purple-100 text-purple-700',
    '手机隐私': 'bg-blue-100 text-blue-700',
    '感情深度': 'bg-pink-100 text-pink-700',
    '小谎言': 'bg-amber-100 text-amber-700',
    '财务诚实': 'bg-green-100 text-green-700',
    '社交边界': 'bg-cyan-100 text-cyan-700',
    '未来规划': 'bg-indigo-100 text-indigo-700',
  }

  return (
    <MobileWrapper>
      <div className="flex flex-col min-h-screen bg-white">
        {/* Status Bar */}
        <StatusBar />

        {/* Top Nav */}
        <div className="flex items-center justify-between px-5 h-[52px] bg-white">
          <Link href="/love-detector" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-lg leading-none">
            ‹
          </Link>
          <span className="text-gray-900 font-bold text-base">
            {nickname !== 'TA' ? `测谎「${nickname}」` : '恋爱测谎仪'}
          </span>
          <span className="text-purple-600 font-semibold text-sm">
            {currentIndex + 1}/{total}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-gray-100">
          <div
            className="h-full transition-all duration-500 rounded-r-full"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #7C3AED, #DB2777)',
            }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col px-5 pt-6 pb-5 overflow-y-auto">
          {/* Category & Difficulty badges */}
          <div className="flex gap-2 mb-5">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${categoryColors[currentQuestion.category] ?? 'bg-gray-100 text-gray-600'}`}>
              {currentQuestion.category}
            </span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${difficultyColors[currentQuestion.difficulty] ?? 'bg-gray-100 text-gray-600'}`}>
              {currentQuestion.difficulty}
            </span>
          </div>

          {/* Question */}
          <h2 className="text-gray-900 font-bold text-xl leading-snug mb-2">
            {currentQuestion.text}
          </h2>
          <p className="text-gray-400 text-sm mb-7">请根据实际情况选择最符合的答案</p>

          {/* Options */}
          <div className="space-y-3 flex-1">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedOption === idx
              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  className={`w-full flex items-center gap-4 px-4 h-[60px] rounded-2xl text-left transition-all active:scale-[0.98] ${
                    isSelected
                      ? 'gradient-primary shadow-lg shadow-purple-500/25 border-0'
                      : 'bg-white border-2 border-gray-100'
                  }`}
                >
                  {/* Option label circle */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-sm ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {OPTION_LABELS[idx]}
                  </div>
                  <span className={`text-sm font-medium flex-1 leading-tight ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                    {option.text}
                  </span>
                  {isSelected && (
                    <span className="text-white text-lg shrink-0">✓</span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-6 mb-4">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === currentIndex
                    ? 'w-5 h-2 bg-purple-600'
                    : i < currentIndex
                    ? 'w-2 h-2 bg-purple-300'
                    : 'w-2 h-2 bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Next button */}
          <button
            onClick={handleNext}
            disabled={selectedOption === null}
            className="w-full h-[56px] rounded-2xl text-white font-bold text-base gradient-primary shadow-lg shadow-purple-500/30 disabled:opacity-30 transition-opacity active:opacity-90"
          >
            {currentIndex + 1 >= total ? '查看结果 →' : '下一题 →'}
          </button>
        </div>
      </div>
    </MobileWrapper>
  )
}
