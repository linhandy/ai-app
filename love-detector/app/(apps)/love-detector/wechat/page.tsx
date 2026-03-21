'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import MobileWrapper from '@/components/MobileWrapper'
import StatusBar from '@/components/StatusBar'
import TabBar from '@/components/TabBar'

type InputMode = 'text' | 'image' | 'voice'
type RiskLevel = 'high' | 'medium' | 'low'

interface SuspiciousPoint {
  quote: string
  reason: string
  riskLevel: RiskLevel
}

interface WechatAnalysis {
  credibilityScore: number
  level: number
  levelLabel: string
  levelColor: string
  summary: string
  suspiciousPoints: SuspiciousPoint[]
  theoreticalBasis: string
  patterns: string[]
  advice: string
  disclaimer: string
}

const LEVEL_CFG: Record<number, { emoji: string; bg: string; border: string; text: string; bar: string }> = {
  5: { emoji: '💚', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', bar: 'bg-green-500' },
  4: { emoji: '💙', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', bar: 'bg-blue-500' },
  3: { emoji: '💛', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', bar: 'bg-amber-500' },
  2: { emoji: '🧡', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', bar: 'bg-orange-500' },
  1: { emoji: '❤️', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', bar: 'bg-red-500' },
}

const RISK_CFG: Record<RiskLevel, { label: string; bg: string; text: string }> = {
  high: { label: '高风险', bg: 'bg-red-100', text: 'text-red-700' },
  medium: { label: '中风险', bg: 'bg-amber-100', text: 'text-amber-700' },
  low: { label: '低风险', bg: 'bg-blue-100', text: 'text-blue-700' },
}

export default function WechatPage() {
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [text, setText] = useState('')
  const [voiceFile, setVoiceFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrText, setOcrText] = useState('')
  const [ocrError, setOcrError] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<WechatAnalysis | null>(null)
  const [shareMode, setShareMode] = useState(false)

  const imageInputRef = useRef<HTMLInputElement>(null)

  const effectiveContent = inputMode === 'text' ? text : inputMode === 'image' ? ocrText : voiceFile?.name ?? ''
  void effectiveContent
  const canAnalyze = !analyzing && (
    (inputMode === 'text' && text.trim().length > 0) ||
    (inputMode === 'image' && ocrText.trim().length > 0) ||
    (inputMode === 'voice' && !!voiceFile)
  )

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setOcrText(''); setOcrError(''); setAnalysis(null); setImagePreview(null)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string
      setImagePreview(dataUrl)
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (!match) return
      const [, mime, b64] = match
      setOcrLoading(true)
      try {
        const res = await fetch('/api/ocr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: b64, mimeType: mime }) })
        const data = await res.json()
        if (data.text) setOcrText(data.text)
        else setOcrError(data.error || '识别失败，请重试或改用文字粘贴')
      } catch { setOcrError('网络错误，请检查连接') }
      finally { setOcrLoading(false) }
    }
    reader.readAsDataURL(file)
  }

  async function handleAnalyze() {
    if (!canAnalyze) return
    setAnalyzing(true); setAnalysis(null)
    const content = inputMode === 'text' ? text : inputMode === 'image' ? ocrText : `[语音文件: ${voiceFile?.name}]`
    try {
      const res = await fetch('/api/analyze-wechat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, source: inputMode }) })
      setAnalysis(await res.json())
    } catch { setAnalysis(null) }
    finally { setAnalyzing(false) }
  }

  function buildShareText() {
    if (!analysis) return ''
    return ['【恋爱测谎仪 · 微信记录分析报告】', `综合可信度：${analysis.credibilityScore}%`, `${LEVEL_CFG[analysis.level]?.emoji ?? ''} ${analysis.levelLabel}`, '', analysis.summary, '', '📚 理论依据：', analysis.theoreticalBasis, '', '💡 建议：', analysis.advice, '', '⚠️ 本报告仅供娱乐参考，不构成事实判断。'].join('\n')
  }

  async function handleShare() {
    const shareText = buildShareText()
    if (navigator.share) {
      try { await navigator.share({ title: '微信记录测谎报告', text: shareText }) } catch { /* cancelled */ }
    } else { setShareMode(true) }
  }

  async function handleCopyShare() {
    await navigator.clipboard.writeText(buildShareText())
    setShareMode(false)
    alert('已复制！打开微信粘贴发送给好友或发朋友圈 😊')
  }

  return (
    <MobileWrapper>
      <div className="flex flex-col min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-[#2D0A6E]">
          <StatusBar dark />
          <div className="flex items-center px-5 pb-4 gap-3">
            <Link href="/love-detector" className="text-white/80 text-2xl leading-none">‹</Link>
            <h1 className="text-white font-bold text-lg flex-1 text-center">微信记录测谎</h1>
            {analysis && <button onClick={handleShare} className="text-white/80 text-sm font-medium">分享</button>}
          </div>
        </div>

        <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
          {!analysis && (
            <div className="bg-[#F5F3FF] rounded-2xl p-4 border border-purple-100">
              <h3 className="text-purple-800 font-bold text-sm mb-2">💡 三种方式任选其一</h3>
              <div className="space-y-1.5">
                {[['💬', '文字粘贴：复制微信聊天内容直接粘贴'], ['🖼', '截图上传：截图聊天记录，AI自动识别文字'], ['🔊', '语音文件：上传微信语音导出文件']].map(([icon, desc]) => (
                  <div key={desc} className="flex gap-2 items-start">
                    <span className="text-base shrink-0">{icon}</span>
                    <p className="text-purple-700 text-xs leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl p-1 flex shadow-sm">
            {([['text', '💬 粘贴文字'], ['image', '🖼 截图上传'], ['voice', '🔊 语音文件']] as const).map(([val, label]) => (
              <button key={val} onClick={() => { setInputMode(val); setAnalysis(null) }} className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${inputMode === val ? 'gradient-primary text-white shadow' : 'text-gray-400'}`}>{label}</button>
            ))}
          </div>

          {inputMode === 'text' && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <textarea value={text} onChange={e => { setText(e.target.value); setAnalysis(null) }} placeholder={'在这里粘贴 TA 的消息内容...\n\n例如：\n"我今晚要加班"\n"没有删过聊天记录"\n"只是普通朋友"'} className="w-full min-h-[160px] text-sm text-gray-800 placeholder-gray-400 outline-none resize-none border-2 border-purple-100 rounded-xl p-3 focus:border-purple-400 bg-purple-50/20" />
              <div className="mt-2 flex justify-between">
                <span className="text-gray-400 text-xs">{text.length} 字</span>
                {text.length > 0 && <button onClick={() => setText('')} className="text-gray-400 text-xs">清空</button>}
              </div>
            </div>
          )}

          {inputMode === 'image' && (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              {imagePreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="聊天截图" className="w-full rounded-xl max-h-56 object-cover" />
                  <button onClick={() => { setImagePreview(null); setOcrText(''); setOcrError(''); setAnalysis(null); if (imageInputRef.current) imageInputRef.current.value = '' }} className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full text-white text-xs flex items-center justify-center">✕</button>
                </div>
              ) : (
                <button onClick={() => imageInputRef.current?.click()} className="w-full py-12 border-2 border-dashed border-purple-200 rounded-xl flex flex-col items-center gap-2 text-purple-400 active:bg-purple-50 transition-colors">
                  <span className="text-4xl">🖼</span>
                  <span className="text-sm font-semibold">点击上传聊天截图</span>
                  <span className="text-xs text-gray-400">支持 JPG、PNG 格式</span>
                </button>
              )}
              {ocrLoading && <div className="flex items-center gap-2 py-1"><div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin shrink-0" /><span className="text-purple-600 text-xs">正在识别截图文字...</span></div>}
              {ocrError && <p className="text-red-500 text-xs">{ocrError}</p>}
              {ocrText && <div className="bg-blue-50 rounded-xl p-3 border border-blue-100"><p className="text-[10px] text-blue-500 font-semibold mb-1.5">📄 识别到的文字内容：</p><p className="text-gray-700 text-xs leading-relaxed max-h-32 overflow-y-auto">{ocrText}</p></div>}
            </div>
          )}

          {inputMode === 'voice' && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <input id="voice-upload" type="file" accept="audio/*" className="hidden" onChange={e => { setVoiceFile(e.target.files?.[0] ?? null); setAnalysis(null) }} />
              <div className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors ${voiceFile ? 'border-purple-400 bg-purple-50' : 'border-gray-200 bg-gray-50'}`} onClick={() => document.getElementById('voice-upload')?.click()}>
                {voiceFile ? (<><span className="text-3xl">🎵</span><p className="text-purple-700 font-semibold text-sm">{voiceFile.name}</p><p className="text-gray-400 text-xs">{(voiceFile.size / 1024).toFixed(1)} KB</p><button onClick={e => { e.stopPropagation(); setVoiceFile(null) }} className="text-red-400 text-xs">删除</button></>) : (<><span className="text-4xl">🔊</span><p className="text-gray-600 font-semibold text-sm">点击上传语音文件</p><p className="text-gray-400 text-xs">支持 MP3、M4A、WAV 格式</p></>)}
              </div>
            </div>
          )}

          {analyzing && (
            <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col items-center gap-3">
              <div className="flex items-center justify-center gap-1 h-10">{Array.from({ length: 8 }).map((_, i) => (<div key={i} className="wave-bar" style={{ height: '8px' }} />))}</div>
              <p className="text-purple-700 font-semibold text-sm">AI 正在深度分析中...</p>
              <p className="text-gray-400 text-xs">基于语言心理学模型进行检测</p>
            </div>
          )}

          {analysis && (
            <div className="space-y-4">
              <div className={`bg-white rounded-2xl p-5 shadow-sm border-2 ${LEVEL_CFG[analysis.level]?.border ?? 'border-gray-200'}`}>
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20 shrink-0">
                    <svg width="80" height="80" className="-rotate-90">
                      <circle cx="40" cy="40" r="32" fill="none" stroke="#F3F4F6" strokeWidth="7" />
                      <circle cx="40" cy="40" r="32" fill="none" stroke={analysis.levelColor === 'green' ? '#059669' : analysis.levelColor === 'blue' ? '#2563EB' : analysis.levelColor === 'yellow' ? '#F59E0B' : analysis.levelColor === 'orange' ? '#F97316' : '#EF4444'} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 32}`} strokeDashoffset={`${2 * Math.PI * 32 * (1 - analysis.credibilityScore / 100)}`} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-lg font-bold text-gray-900">{analysis.credibilityScore}%</span></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1"><span className="text-xl">{LEVEL_CFG[analysis.level]?.emoji}</span><span className={`font-bold text-sm ${LEVEL_CFG[analysis.level]?.text}`}>{analysis.levelLabel}</span></div>
                    <p className="text-gray-600 text-xs leading-relaxed">{analysis.summary}</p>
                  </div>
                </div>
              </div>

              {analysis.suspiciousPoints?.length > 0 && (
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <h3 className="text-gray-800 font-bold text-sm mb-3">🔍 可疑点标记</h3>
                  <div className="space-y-3">
                    {analysis.suspiciousPoints.map((sp, i) => {
                      const rc = RISK_CFG[sp.riskLevel] ?? RISK_CFG.medium
                      return (<div key={i} className="border border-gray-100 rounded-xl p-3"><div className="flex items-start gap-2 mb-1.5"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${rc.bg} ${rc.text}`}>{rc.label}</span><p className="text-gray-800 text-xs font-medium">「{sp.quote}」</p></div><p className="text-gray-500 text-xs leading-relaxed">{sp.reason}</p></div>)
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-[#1E1035] px-4 py-3 flex items-center gap-2"><span className="text-lg">🤖</span><h3 className="text-white font-bold text-sm">AI 深度分析</h3></div>
                <div className="bg-[#2A1A50] px-4 py-4 space-y-4">
                  <div className="bg-white/10 rounded-xl p-3"><p className="text-purple-300 text-[10px] font-semibold mb-1.5">📚 理论依据</p><p className="text-white/80 text-xs leading-relaxed">{analysis.theoreticalBasis}</p></div>
                  {analysis.patterns?.length > 0 && (<div><p className="text-purple-300 text-[10px] font-semibold mb-2">📊 语言模式</p><div className="space-y-1.5">{analysis.patterns.map((p, i) => (<div key={i} className="flex gap-2"><span className="text-purple-400 text-[10px] mt-0.5">▸</span><p className="text-white/80 text-xs leading-relaxed">{p}</p></div>))}</div></div>)}
                  <div className="bg-white/10 rounded-xl p-3"><p className="text-purple-300 text-[10px] font-semibold mb-1.5">💡 专业建议</p><p className="text-white/80 text-xs leading-relaxed">{analysis.advice}</p></div>
                  <p className="text-white/40 text-[10px]">{analysis.disclaimer}</p>
                </div>
              </div>

              <button onClick={() => setAnalysis(null)} className="w-full py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm">🔄 重新输入</button>
            </div>
          )}

          {!analyzing && !analysis && (
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <p className="text-amber-700 text-xs leading-relaxed">⚠️ 本工具仅供娱乐参考，基于语言心理学模型分析，不构成事实判断。请理性对待结果，重要问题建议直接沟通。</p>
            </div>
          )}
        </div>

        {!analyzing && !analysis && (
          <div className="px-5 pb-2 bg-gray-50">
            <button onClick={handleAnalyze} disabled={!canAnalyze} className="w-full py-4 rounded-2xl text-white font-bold text-base gradient-primary shadow-lg shadow-purple-500/30 disabled:opacity-40 active:opacity-90 transition-opacity">🔬 开始分析</button>
          </div>
        )}

        {analysis && (
          <div className="px-5 pb-2 bg-gray-50">
            <button onClick={handleShare} className="w-full py-4 rounded-2xl text-white font-bold text-base gradient-primary shadow-lg shadow-purple-500/30">💬 分享到微信</button>
          </div>
        )}

        <TabBar activeTab="test" />
      </div>

      {shareMode && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={() => setShareMode(false)}>
          <div className="bg-white w-full rounded-t-3xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-gray-900 font-bold text-base text-center">分享到微信</h3>
            <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-600 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">{buildShareText()}</div>
            <p className="text-gray-400 text-xs text-center">复制后打开微信，粘贴发送给好友或发朋友圈</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShareMode(false)} className="py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm">取消</button>
              <button onClick={handleCopyShare} className="py-3 rounded-xl text-white font-semibold text-sm gradient-primary">📋 复制内容</button>
            </div>
          </div>
        </div>
      )}
    </MobileWrapper>
  )
}
