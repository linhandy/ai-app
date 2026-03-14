'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import MobileWrapper from '@/components/MobileWrapper'
import StatusBar from '@/components/StatusBar'
import TabBar from '@/components/TabBar'
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
  judgment: 'true' | 'lie'
  credibility: number
  transcript?: string
}

function WaveAnimation() {
  return (
    <div className="flex items-center justify-center gap-1 h-10">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="wave-bar" style={{ height: '8px' }} />
      ))}
    </div>
  )
}

export default function TestPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [inputMode, setInputMode] = useState<'voice' | 'text' | 'image'>('voice')
  const [textInput, setTextInput] = useState('')
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [credibility, setCredibility] = useState<number | null>(null)
  const [judgment, setJudgment] = useState<'true' | 'lie' | null>(null)
  const [autoJudged, setAutoJudged] = useState(false)
  const [nickname, setNickname] = useState('')
  // Image mode
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState('image/jpeg')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrText, setOcrText] = useState('')
  const [ocrError, setOcrError] = useState('')

  const recognitionRef = useRef<any>(null)
  const transcriptRef = useRef('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const startAnalysis = useCallback((inputText?: string) => {
    setAnalyzing(true)
    setCredibility(null)
    setJudgment(null)
    setAutoJudged(false)

    // Heuristic: longer, more detailed answers tend to be more credible
    const text = inputText || transcriptRef.current || textInput
    let baseScore = Math.floor(Math.random() * 40) + 45 // 45-84
    if (text.length > 30) baseScore = Math.min(85, baseScore + 8)
    if (text.length < 5 && text.length > 0) baseScore = Math.max(30, baseScore - 12)

    const target = Math.min(90, Math.max(25, baseScore))

    let current = 0
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 8) + 3
      if (current >= target) {
        current = target
        clearInterval(interval)
        setAnalyzing(false)
        // Auto-determine judgment
        const autoJudgment = current >= 60 ? 'true' : 'lie'
        setJudgment(autoJudgment)
        setAutoJudged(true)
      }
      setCredibility(current)
    }, 120)
  }, [textInput])

  function handleStartRecording() {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setInputMode('text')
      return
    }

    setTranscript('')
    transcriptRef.current = ''
    setCredibility(null)
    setJudgment(null)
    setAutoJudged(false)

    const recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onstart = () => setIsRecording(true)

    recognition.onresult = (event: any) => {
      let text = ''
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript
      }
      transcriptRef.current = text
      setTranscript(text)
    }

    recognition.onend = () => {
      setIsRecording(false)
      if (transcriptRef.current.trim()) {
        startAnalysis(transcriptRef.current)
      }
    }

    recognition.onerror = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()

    // Auto-stop after 15 seconds
    setTimeout(() => {
      if (recognitionRef.current && isRecording) {
        recognitionRef.current.stop()
      }
    }, 15000)
  }

  function handleStopRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setOcrText('')
    setOcrError('')
    setCredibility(null)
    setJudgment(null)
    setAutoJudged(false)
    setImagePreview(null)

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      setImagePreview(dataUrl)

      // Extract base64 and mime type
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (!match) return
      const [, mime, b64] = match
      setImageBase64(b64)
      setImageMimeType(mime)

      // Run OCR
      setOcrLoading(true)
      try {
        const res = await fetch('/api/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: b64, mimeType: mime }),
        })
        const data = await res.json()
        if (data.text) {
          setOcrText(data.text)
          transcriptRef.current = data.text
          startAnalysis(data.text)
        } else {
          setOcrError(data.error || '识别失败，请重试')
        }
      } catch {
        setOcrError('网络错误，请检查连接')
      } finally {
        setOcrLoading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  function handleJudgmentOverride(j: 'true' | 'lie') {
    setJudgment(j)
    setAutoJudged(false)
  }

  function handleNext() {
    if (!judgment) return
    const q = questions[currentIndex]
    const newAnswer: Answer = {
      questionId: q.id,
      questionText: q.text,
      category: q.category,
      judgment,
      credibility: credibility ?? 50,
      transcript: transcript || ocrText || textInput || undefined,
    }
    const newAnswers = [...answers, newAnswer]
    setAnswers(newAnswers)

    if (currentIndex + 1 >= questions.length) {
      localStorage.setItem('ld_answers', JSON.stringify(newAnswers))

      const historyRaw = localStorage.getItem('ld_history')
      const history = historyRaw ? JSON.parse(historyRaw) : []
      const newHistoryItem = {
        date: new Date().toISOString(),
        answers: newAnswers,
        nickname,
        config: localStorage.getItem('ld_setup'),
      }
      localStorage.setItem('ld_history', JSON.stringify([newHistoryItem, ...history].slice(0, 5)))
      router.push('/result')
    } else {
      setCurrentIndex(prev => prev + 1)
      setJudgment(null)
      setAutoJudged(false)
      setCredibility(null)
      setTextInput('')
      setTranscript('')
      transcriptRef.current = ''
      setAnalyzing(false)
      setIsRecording(false)
      setImagePreview(null)
      setImageBase64(null)
      setOcrText('')
      setOcrError('')
    }
  }

  if (questions.length === 0) {
    return (
      <MobileWrapper>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </MobileWrapper>
    )
  }

  const q = questions[currentIndex]
  const progress = (currentIndex / questions.length) * 100

  const difficultyColors: Record<string, string> = {
    '温和': 'bg-green-100 text-green-700',
    '犀利': 'bg-amber-100 text-amber-700',
    '灵魂拷问': 'bg-red-100 text-red-700',
  }

  const categoryColors: Record<string, string> = {
    '忠诚度': 'bg-purple-100 text-purple-800',
    '手机隐私': 'bg-blue-100 text-blue-800',
    '感情深度': 'bg-pink-100 text-pink-800',
    '小谎言': 'bg-amber-100 text-amber-800',
    '财务诚实': 'bg-green-100 text-green-800',
  }

  const credibilityColor =
    credibility === null ? 'text-gray-400'
    : credibility >= 70 ? 'text-green-600'
    : credibility >= 50 ? 'text-amber-600'
    : 'text-red-600'

  const canGoNext = judgment !== null && !analyzing

  return (
    <MobileWrapper>
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-[#2D0A6E]">
          <StatusBar dark />
          <div className="flex items-center px-5 pb-4 gap-3">
            <Link href="/setup" className="text-white/80 text-2xl leading-none">‹</Link>
            <h1 className="text-white font-bold text-base flex-1 text-center">
              {nickname !== 'TA' ? `测谎「${nickname}」` : '测谎进行中'}
            </h1>
            <span className="text-white/60 text-xs">{currentIndex + 1}/{questions.length}</span>
          </div>
        </div>

        <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
          {/* Progress */}
          <div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full gradient-primary rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question card */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex gap-2 mb-3 flex-wrap">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${categoryColors[q.category] || 'bg-gray-100 text-gray-600'}`}>
                {q.category}
              </span>
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${difficultyColors[q.difficulty] || 'bg-gray-100 text-gray-600'}`}>
                {q.difficulty}
              </span>
            </div>
            <p className="text-gray-900 text-lg font-bold leading-snug mb-3">{q.text}</p>
            <div className="bg-amber-50 rounded-xl px-3 py-2.5 border border-amber-100">
              <p className="text-amber-700 text-xs leading-relaxed">💡 {q.instruction}</p>
            </div>
          </div>

          {/* Input mode toggle */}
          <div className="bg-white rounded-2xl p-1 flex shadow-sm">
            {([['voice', '🎙 录音'], ['text', '⌨ 文字'], ['image', '🖼 图片']] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setInputMode(val)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  inputMode === val ? 'gradient-primary text-white shadow' : 'text-gray-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Voice input */}
          {inputMode === 'voice' && (
            <div className="bg-white rounded-2xl p-5 flex flex-col items-center gap-3 shadow-sm">
              {isRecording ? (
                <>
                  <WaveAnimation />
                  <p className="text-purple-600 text-sm font-medium animate-pulse">正在录音中...</p>
                  <button
                    onClick={handleStopRecording}
                    className="px-6 py-2 rounded-xl bg-red-100 text-red-600 text-sm font-semibold"
                  >
                    ⏹ 停止录音
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartRecording}
                  disabled={analyzing}
                  className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-3xl shadow-lg shadow-purple-500/30 active:scale-95 transition-transform disabled:opacity-50"
                >
                  🎙
                </button>
              )}
              {transcript ? (
                <div className="w-full bg-purple-50 rounded-xl p-3 border border-purple-100">
                  <p className="text-[10px] text-purple-400 font-medium mb-1">🎤 录音识别内容：</p>
                  <p className="text-gray-700 text-xs leading-relaxed">{transcript}</p>
                </div>
              ) : (
                !isRecording && !analyzing && (
                  <p className="text-gray-400 text-xs text-center">点击麦克风开始录音，说完后自动分析</p>
                )
              )}
            </div>
          )}

          {/* Text input */}
          {inputMode === 'text' && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder={`输入${nickname}的回答内容...`}
                className="w-full h-24 text-sm text-gray-800 placeholder-gray-400 outline-none resize-none"
              />
              <button
                onClick={() => { if (textInput.trim()) startAnalysis(textInput) }}
                disabled={!textInput.trim() || analyzing}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-white gradient-primary disabled:opacity-50 mt-2"
              >
                {analyzing ? '分析中...' : '🔬 分析文字'}
              </button>
            </div>
          )}

          {/* Image input */}
          {inputMode === 'image' && (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              {imagePreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="上传的图片" className="w-full rounded-xl max-h-48 object-cover" />
                  <button
                    onClick={() => {
                      setImagePreview(null)
                      setOcrText('')
                      setOcrError('')
                      if (fileInputRef.current) fileInputRef.current.value = ''
                    }}
                    className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full text-white text-xs flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-10 border-2 border-dashed border-purple-200 rounded-xl flex flex-col items-center gap-2 text-purple-400 active:bg-purple-50 transition-colors"
                >
                  <span className="text-3xl">🖼</span>
                  <span className="text-xs font-medium">点击上传聊天截图或图片</span>
                  <span className="text-[10px] text-gray-400">支持 JPG、PNG 格式</span>
                </button>
              )}
              {ocrLoading && (
                <div className="flex items-center gap-2 py-2">
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-purple-600 text-xs">正在识别图片文字...</span>
                </div>
              )}
              {ocrError && (
                <p className="text-red-500 text-xs">{ocrError}</p>
              )}
              {ocrText && (
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <p className="text-[10px] text-blue-400 font-medium mb-1">📄 图片识别内容：</p>
                  <p className="text-gray-700 text-xs leading-relaxed line-clamp-4">{ocrText}</p>
                </div>
              )}
            </div>
          )}

          {/* Analysis panel */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-gray-800 font-bold text-sm">实时可信度分析</h3>
              {credibility !== null && (
                <span className={`text-lg font-bold ${credibilityColor}`}>
                  {credibility}%
                </span>
              )}
            </div>

            {(analyzing || credibility !== null) ? (
              <>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      credibility === null ? 'w-0'
                      : credibility >= 70 ? 'bg-green-500'
                      : credibility >= 50 ? 'bg-amber-500'
                      : 'bg-red-500'
                    }`}
                    style={{ width: credibility !== null ? `${credibility}%` : '0%' }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: '语言一致性', value: analyzing ? '...' : `${Math.floor(Math.random() * 25) + 60}%` },
                    { label: '情绪稳定度', value: analyzing ? '...' : `${Math.floor(Math.random() * 25) + 55}%` },
                    { label: '回答流畅度', value: analyzing ? '...' : `${Math.floor(Math.random() * 20) + 65}%` },
                  ].map(metric => (
                    <div key={metric.label} className="bg-purple-50 rounded-xl p-2 text-center">
                      <p className="text-purple-600 font-bold text-sm">{metric.value}</p>
                      <p className="text-purple-400 text-[9px]">{metric.label}</p>
                    </div>
                  ))}
                </div>

                {/* Auto-judgment result */}
                {judgment && !analyzing && (
                  <div className={`rounded-xl p-3 border flex items-center gap-2 ${
                    judgment === 'true'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <span className="text-lg">{judgment === 'true' ? '✅' : '❌'}</span>
                    <div className="flex-1">
                      <p className={`text-xs font-bold ${judgment === 'true' ? 'text-green-700' : 'text-red-700'}`}>
                        AI 判断：{judgment === 'true' ? '说的是真话' : '存在说谎迹象'}
                      </p>
                      {autoJudged && (
                        <p className="text-[10px] text-gray-400 mt-0.5">基于可信度自动判断 · 点击下方可手动修改</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-400 text-xs text-center py-2">
                {inputMode === 'voice' ? '录音后自动开始分析...'
                  : inputMode === 'image' ? '上传图片后自动识别分析...'
                  : '输入回答后点击分析...'}
              </p>
            )}
          </div>

          {/* Manual override buttons */}
          {credibility !== null && !analyzing && (
            <div>
              <p className="text-gray-400 text-[10px] text-center mb-2">不同意判断？手动修改：</p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleJudgmentOverride('true')}
                  className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 ${
                    judgment === 'true'
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-green-50 text-green-600 border-green-200'
                  }`}
                >
                  ✅ 真话
                </button>
                <button
                  onClick={() => handleJudgmentOverride('lie')}
                  className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-2 ${
                    judgment === 'lie'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-red-50 text-red-600 border-red-200'
                  }`}
                >
                  ❌ 谎言
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Next button */}
        <div className="px-5 pb-2 bg-gray-50">
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className="w-full py-4 rounded-2xl text-white font-bold text-base gradient-primary shadow-lg shadow-purple-500/30 disabled:opacity-40 active:opacity-90 transition-opacity"
          >
            {currentIndex + 1 >= questions.length ? '查看结果 ›' : '下一题 ›'}
          </button>
        </div>

        <TabBar activeTab="test" />
      </div>
    </MobileWrapper>
  )
}
