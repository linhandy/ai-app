'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import UploadZone from '@/components/UploadZone'

const CHIPS = [
  { label: 'Sofa', value: 'a modern sofa' },
  { label: 'Rug', value: 'a stylish area rug' },
  { label: 'Curtains', value: 'elegant curtains' },
  { label: 'Wall Color', value: 'a fresh wall color' },
  { label: 'Ceiling Light', value: 'a modern ceiling light fixture' },
  { label: 'Coffee Table', value: 'a coffee table' },
  { label: 'Plant', value: 'indoor plants' },
  { label: 'Lamp', value: 'a floor lamp' },
]

interface DisplayRect { dx: number; dy: number; dw: number; dh: number }

interface Props {
  onOriginalUpload: (uploadId: string) => void
  onCompositeReady: (getBlob: () => Promise<Blob>) => void
  onMaskChange: (hasMask: boolean) => void
  onPromptChange: (prompt: string) => void
}

export default function InpaintCanvas({ onOriginalUpload, onCompositeReady, onMaskChange, onPromptChange }: Props) {
  const [phase, setPhase] = useState<'upload' | 'paint'>('upload')
  const [brushSize, setBrushSize] = useState(40)
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush')
  const [prompt, setPrompt] = useState('')

  const containerRef = useRef<HTMLDivElement>(null)
  const baseCanvasRef = useRef<HTMLCanvasElement>(null)
  const maskCanvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const displayRectRef = useRef<DisplayRect | null>(null)
  const drawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const hasStrokesRef = useRef(false)

  const drawBaseImage = useCallback((canvas: HTMLCanvasElement, img: HTMLImageElement): DisplayRect => {
    const cw = canvas.width, ch = canvas.height
    const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight)
    const dw = Math.round(img.naturalWidth * scale)
    const dh = Math.round(img.naturalHeight * scale)
    const dx = Math.round((cw - dw) / 2)
    const dy = Math.round((ch - dh) / 2)
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, cw, ch)
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, cw, ch)
    ctx.drawImage(img, dx, dy, dw, dh)
    return { dx, dy, dw, dh }
  }, [])

  const getBlob = useCallback((): Promise<Blob> => {
    const img = imgRef.current!
    const maskCanvas = maskCanvasRef.current!
    const { dx, dy, dw, dh } = displayRectRef.current!
    const offscreen = document.createElement('canvas')
    offscreen.width = img.naturalWidth
    offscreen.height = img.naturalHeight
    const ctx = offscreen.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    ctx.drawImage(maskCanvas, dx, dy, dw, dh, 0, 0, img.naturalWidth, img.naturalHeight)
    return new Promise<Blob>((resolve, reject) =>
      offscreen.toBlob((blob) => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/jpeg', 0.92)
    )
  }, [])

  useEffect(() => {
    if (phase !== 'paint' || !imgRef.current || !containerRef.current) return
    const container = containerRef.current
    const baseCanvas = baseCanvasRef.current!
    const maskCanvas = maskCanvasRef.current!
    baseCanvas.width = container.clientWidth
    baseCanvas.height = container.clientHeight
    maskCanvas.width = container.clientWidth
    maskCanvas.height = container.clientHeight
    displayRectRef.current = drawBaseImage(baseCanvas, imgRef.current)
  }, [phase, drawBaseImage])

  const handleUpload = useCallback((uploadId: string, previewUrl: string) => {
    onOriginalUpload(uploadId)
    const img = new Image()
    img.src = previewUrl
    img.onload = () => {
      imgRef.current = img
      setPhase('paint')
    }
  }, [onOriginalUpload])

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = maskCanvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    return { x: clientX - rect.left, y: clientY - rect.top }
  }

  const paintAt = useCallback((x: number, y: number) => {
    const ctx = maskCanvasRef.current!.getContext('2d')!
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.fillStyle = 'rgba(0,0,0,1)'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'rgba(220, 38, 38, 0.55)'
      ctx.strokeStyle = 'rgba(220, 38, 38, 0.55)'
    }
    ctx.lineWidth = brushSize
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
    if (lastPos.current) {
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
    lastPos.current = { x, y }
    ctx.globalCompositeOperation = 'source-over'

    if (!hasStrokesRef.current && tool === 'brush') {
      hasStrokesRef.current = true
      onMaskChange(true)
      onCompositeReady(getBlob)
    }
  }, [tool, brushSize, onMaskChange, onCompositeReady, getBlob])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    drawing.current = true
    lastPos.current = null
    const pos = getCanvasPos(e)
    paintAt(pos.x, pos.y)
  }, [paintAt])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing.current) return
    const pos = getCanvasPos(e)
    paintAt(pos.x, pos.y)
  }, [paintAt])

  const stopDrawing = useCallback(() => {
    drawing.current = false
    lastPos.current = null
  }, [])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    drawing.current = true
    lastPos.current = null
    const pos = getCanvasPos(e)
    paintAt(pos.x, pos.y)
  }, [paintAt])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    if (!drawing.current) return
    const pos = getCanvasPos(e)
    paintAt(pos.x, pos.y)
  }, [paintAt])

  const clearMask = useCallback(() => {
    const canvas = maskCanvasRef.current!
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height)
    hasStrokesRef.current = false
    onMaskChange(false)
  }, [onMaskChange])

  const handlePromptChange = (value: string) => {
    setPrompt(value)
    onPromptChange(value)
  }

  const handleChip = (value: string) => {
    handlePromptChange(value)
  }

  if (phase === 'upload') {
    return <UploadZone key="inpaint-room" onUpload={handleUpload} />
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Canvas editor */}
      <div
        ref={containerRef}
        className="relative w-full h-[260px] md:h-[340px] rounded-lg overflow-hidden bg-[#0a0a0a] select-none"
        style={{ touchAction: 'none' }}
      >
        <canvas ref={baseCanvasRef} className="absolute inset-0 w-full h-full" />
        <canvas
          ref={maskCanvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTool('brush')}
          className={`px-3 h-8 rounded text-sm font-medium transition-colors ${tool === 'brush' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          🖌️ Brush
        </button>
        <button
          type="button"
          onClick={() => setTool('eraser')}
          className={`px-3 h-8 rounded text-sm font-medium transition-colors ${tool === 'eraser' ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          ⬜ Eraser
        </button>
        <input
          type="range"
          min={10}
          max={120}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="flex-1 accent-amber-500"
          title="Brush size"
        />
        <span className="text-gray-500 text-xs w-6 text-center">{brushSize}</span>
        <button
          type="button"
          onClick={clearMask}
          className="px-3 h-8 rounded text-sm text-gray-500 bg-gray-800 hover:bg-gray-700 transition-colors"
          title="Clear mask"
        >
          🗑️
        </button>
      </div>

      {/* Chips + text */}
      <div>
        <p className="text-gray-400 text-xs mb-2">Replace with:</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => handleChip(chip.value)}
              className={`px-3 h-7 rounded-full text-xs font-medium transition-colors border ${
                prompt === chip.value
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={prompt}
          onChange={(e) => handlePromptChange(e.target.value.slice(0, 150))}
          placeholder="or describe what to put here..."
          className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
        />
      </div>
    </div>
  )
}
