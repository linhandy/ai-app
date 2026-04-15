'use client'
import { useCallback, useState } from 'react'
import { regionConfig } from '@/lib/region-config'

const s = regionConfig.strings

interface Props {
  onUpload: (uploadId: string, previewUrl: string) => void
}

export default function UploadZone({ onUpload }: Props) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setUploading(true)
    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)

    const fd = new FormData()
    fd.append('image', file)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onUpload(data.uploadId, localUrl)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '上传失败'
      setError(message)
      setPreview(null)
    } finally {
      setUploading(false)
    }
  }, [onUpload])

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
      className={`relative w-full h-[200px] md:h-[280px] rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors
        ${dragging ? 'border-amber-500 bg-amber-500/5' : 'border-gray-700 bg-[#0A0A0A] hover:border-gray-500'}`}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="预览" className="w-full h-full object-cover rounded-lg absolute inset-0" />
      ) : (
        <>
          <div className="w-14 h-14 rounded-full bg-[#1A1A1A] flex items-center justify-center">
            <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-white font-semibold text-base">{uploading ? '上传中...' : s.uploadPrompt}</p>
          <p className="text-gray-500 text-sm">{s.uploadDragHint}</p>
          <button className="mt-1 px-6 h-9 bg-gray-800 text-gray-300 text-sm rounded hover:bg-gray-700 transition-colors">选择文件</button>
        </>
      )}

      {error && <p className="absolute bottom-3 text-red-400 text-sm">{error}</p>}
    </div>
  )
}
