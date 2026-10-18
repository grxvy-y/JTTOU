import { useCallback, useRef, useState } from 'react'
import { uploadFiles, type UploadSummary } from '../services/api'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FileEntry {
  id: string
  file: File
  preview: string | null   // object URL for images, null otherwise
  identified: FileIdentity
}

interface FileIdentity {
  label: string   // human-readable category
  icon:  string   // emoji shorthand
  color: string   // accent colour for badge
}

type UploadStatus = 'idle' | 'uploading' | 'done' | 'error'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function identifyFile(file: File): FileIdentity {
  const { type, name } = file
  const ext = name.split('.').pop()?.toLowerCase() ?? ''

  if (type.startsWith('image/'))
    return { label: 'Image',       icon: '🖼️',  color: '#7c6fa0' }
  if (type === 'application/pdf')
    return { label: 'PDF',         icon: '📄',  color: '#b05a7a' }
  if (type.startsWith('text/') || ['txt', 'md', 'csv'].includes(ext))
    return { label: 'Text file',   icon: '📝',  color: '#5a8a6a' }
  if (['xls','xlsx'].includes(ext) || type.includes('spreadsheet'))
    return { label: 'Spreadsheet', icon: '📊',  color: '#5a7aaa' }
  if (['doc','docx'].includes(ext) || type.includes('word'))
    return { label: 'Document',    icon: '📃',  color: '#8a6a40' }
  if (['zip','rar','7z','tar','gz'].includes(ext))
    return { label: 'Archive',     icon: '📦',  color: '#6a5a8a' }
  return   { label: 'Unknown',    icon: '📎',  color: '#888' }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 ** 2)  return `${(bytes / 1024).toFixed(1)} KB`
  return                         `${(bytes / 1024 ** 2).toFixed(1)} MB`
}

function uid() {
  return Math.random().toString(36).slice(2)
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function FileDropZone() {
  const [entries, setEntries]   = useState<FileEntry[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Upload state
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle')
  const [uploadProgress, setUploadProgress] = useState({ completed: 0, total: 0, currentFile: '' })
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null)

  // Build a FileEntry from a raw File
  const buildEntry = useCallback((file: File): FileEntry => {
    const preview = file.type.startsWith('image/')
      ? URL.createObjectURL(file)
      : null
    return { id: uid(), file, preview, identified: identifyFile(file) }
  }, [])

  // Add files — deduplicates by name+size
  const addFiles = useCallback((raw: FileList | File[]) => {
    const incoming = Array.from(raw)
    setEntries(prev => {
      const existing = new Set(prev.map(e => `${e.file.name}::${e.file.size}`))
      const fresh = incoming
        .filter(f => !existing.has(`${f.name}::${f.size}`))
        .map(buildEntry)
      return [...prev, ...fresh]
    })
  }, [buildEntry])

  // Remove a single entry (and revoke its object URL to avoid memory leaks)
  const removeEntry = (id: string) => {
    setEntries(prev => {
      const entry = prev.find(e => e.id === id)
      if (entry?.preview) URL.revokeObjectURL(entry.preview)
      return prev.filter(e => e.id !== id)
    })
  }

  // Clear all
  const clearAll = () => {
    entries.forEach(e => { if (e.preview) URL.revokeObjectURL(e.preview) })
    setEntries([])
    setUploadStatus('idle')
    setUploadSummary(null)
  }

  // Submit / upload all files
  const handleSubmit = async () => {
    if (entries.length === 0 || uploadStatus === 'uploading') return

    setUploadStatus('uploading')
    setUploadSummary(null)
    setUploadProgress({ completed: 0, total: entries.length, currentFile: '' })

    try {
      const files = entries.map(e => e.file)
      const summary = await uploadFiles(files, (completed, total, currentFile) => {
        setUploadProgress({ completed, total, currentFile })
      })

      setUploadSummary(summary)
      setUploadStatus(summary.failedCount > 0 && summary.successCount === 0 ? 'error' : 'done')

      // If all succeeded, clear entries after a brief delay so user sees the summary
      if (summary.failedCount === 0) {
        setTimeout(() => {
          entries.forEach(e => { if (e.preview) URL.revokeObjectURL(e.preview) })
          setEntries([])
        }, 3000)
      }
    } catch {
      setUploadStatus('error')
    }
  }

  // ── Drag handlers ──
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragging(false) }
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) addFiles(e.target.files)
    e.target.value = ''   // reset so same file can be re-added later
  }

  // ── Styles ──
  const zone: React.CSSProperties = {
    border: `2px dashed ${dragging ? 'var(--color-accent)' : 'rgba(47,43,64,0.25)'}`,
    borderRadius: '20px',
    padding: '48px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
    background: dragging
      ? 'rgba(47,43,64,0.07)'
      : 'rgba(254,250,255,0.35)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    userSelect: 'none',
  }

  const isUploading = uploadStatus === 'uploading'
  const progressPct = uploadProgress.total > 0
    ? Math.round((uploadProgress.completed / uploadProgress.total) * 100)
    : 0

  return (
    <section style={{ width: '100%', maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Drop zone ── */}
      <div
        role="button"
        tabIndex={0}
        aria-label="File drop zone. Click or drag files here."
        style={zone}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
      >
        {/* Cloud upload icon */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '16px',
          background: 'rgba(47,43,64,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '28px',
          transition: 'transform 0.2s',
          transform: dragging ? 'scale(1.12)' : 'scale(1)',
        }}>
          {dragging ? '📂' : '📁'}
        </div>

        <p style={{ margin: 0, fontFamily: "'ADLaM Display', cursive", fontSize: '1.05rem', color: 'var(--color-accent)' }}>
          {dragging ? 'Drop to upload' : 'Drop files here, or click to browse'}
        </p>
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text)', opacity: 0.55 }}>
          Images, PDFs, text files — multiple allowed
        </p>

        {/* Hidden file input — accept list opens photo gallery on mobile */}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,.txt,.csv,.xls,.xlsx"
          style={{ display: 'none' }}
          onChange={onInputChange}
          aria-hidden="true"
        />
      </div>

      {/* ── File list ── */}
      {entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-accent)', opacity: 0.7, fontFamily: "'ADLaM Display', cursive" }}>
              {entries.length} file{entries.length !== 1 ? 's' : ''} added
            </span>
            <button
              onClick={clearAll}
              disabled={isUploading}
              style={{
                background: 'none', border: 'none', cursor: isUploading ? 'not-allowed' : 'pointer',
                fontSize: '0.75rem', color: 'var(--color-accent)', opacity: isUploading ? 0.3 : 0.5,
                fontFamily: "'ADLaM Display', cursive",
                padding: '4px 8px', borderRadius: '8px',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => !isUploading && (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => !isUploading && (e.currentTarget.style.opacity = '0.5')}
            >
              Clear all
            </button>
          </div>

          {/* Individual file cards */}
          {entries.map(entry => (
            <FileCard key={entry.id} entry={entry} onRemove={() => removeEntry(entry.id)} disabled={isUploading} />
          ))}
        </div>
      )}

      {/* ── Upload progress bar ── */}
      {isUploading && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '8px',
          padding: '16px 20px',
          borderRadius: '14px',
          background: 'rgba(254,250,255,0.55)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(47,43,64,0.10)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: '0.8rem', color: 'var(--color-accent)',
              fontFamily: "'ADLaM Display', cursive",
            }}>
              Analyzing {uploadProgress.currentFile}…
            </span>
            <span style={{
              fontSize: '0.72rem', color: 'var(--color-accent)', opacity: 0.6,
            }}>
              {uploadProgress.completed}/{uploadProgress.total}
            </span>
          </div>
          <div style={{
            height: '6px', borderRadius: '999px',
            background: 'rgba(47,43,64,0.10)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: '999px',
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #7c6fa0, #b05a7a)',
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      )}

      {/* ── Upload summary (success/error) ── */}
      {uploadSummary && uploadStatus !== 'uploading' && (
        <div style={{
          padding: '16px 20px',
          borderRadius: '14px',
          background: uploadStatus === 'error'
            ? 'rgba(176,90,122,0.12)'
            : 'rgba(90,138,106,0.12)',
          border: `1px solid ${uploadStatus === 'error' ? 'rgba(176,90,122,0.25)' : 'rgba(90,138,106,0.25)'}`,
          display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
          <span style={{
            fontSize: '0.88rem', fontFamily: "'ADLaM Display', cursive",
            color: uploadStatus === 'error' ? '#b05a7a' : '#5a8a6a',
            fontWeight: 600,
          }}>
            {uploadStatus === 'error'
              ? '⚠️ Upload failed'
              : `✨ ${uploadSummary.totalShifts} date${uploadSummary.totalShifts !== 1 ? 's' : ''} extracted from ${uploadSummary.successCount} file${uploadSummary.successCount !== 1 ? 's' : ''}`
            }
          </span>
          {uploadSummary.totalDaysOff > 0 && uploadStatus === 'done' && (
            <span style={{ fontSize: '0.78rem', color: 'var(--color-accent)', opacity: 0.65 }}>
              Including {uploadSummary.totalDaysOff} day{uploadSummary.totalDaysOff !== 1 ? 's' : ''} off 🩷
            </span>
          )}
          {uploadSummary.failedCount > 0 && (
            <span style={{ fontSize: '0.78rem', color: '#b05a7a', opacity: 0.8 }}>
              {uploadSummary.failedCount} file{uploadSummary.failedCount !== 1 ? 's' : ''} failed — try re-uploading
            </span>
          )}
        </div>
      )}

      {/* ── Submit / Confirm button ── */}
      {entries.length > 0 && uploadStatus !== 'done' && (
        <button
          id="submit-files-btn"
          onClick={handleSubmit}
          disabled={isUploading}
          style={{
            padding: '14px 36px',
            borderRadius: '14px',
            border: 'none',
            cursor: isUploading ? 'not-allowed' : 'pointer',
            fontFamily: "'ADLaM Display', cursive",
            fontSize: '1rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            color: '#FEFAFF',
            background: isUploading
              ? 'rgba(47,43,64,0.35)'
              : 'linear-gradient(135deg, #2f2b40 0%, #5a4a6a 50%, #7c6fa0 100%)',
            boxShadow: isUploading
              ? 'none'
              : '0 4px 20px rgba(47,43,64,0.25), 0 1px 4px rgba(47,43,64,0.12)',
            transition: 'all 0.3s ease',
            transform: 'translateY(0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            alignSelf: 'center',
            minWidth: '220px',
          }}
          onMouseEnter={e => {
            if (!isUploading) {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(47,43,64,0.35), 0 2px 8px rgba(124,111,160,0.3)'
            }
          }}
          onMouseLeave={e => {
            if (!isUploading) {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(47,43,64,0.25), 0 1px 4px rgba(47,43,64,0.12)'
            }
          }}
        >
          {isUploading ? (
            <>
              <span style={{
                display: 'inline-block', width: '16px', height: '16px',
                border: '2px solid rgba(254,250,255,0.3)',
                borderTopColor: '#FEFAFF',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              Analyzing…
            </>
          ) : (
            <>
              ✨ Confirm & Analyze
            </>
          )}
        </button>
      )}

      {/* Keyframes for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  )
}

// ─── FileCard sub-component ───────────────────────────────────────────────────

function FileCard({ entry, onRemove, disabled }: { entry: FileEntry; onRemove: () => void; disabled?: boolean }) {
  const { file, preview, identified } = entry

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '12px 16px',
      borderRadius: '14px',
      background: 'rgba(254,250,255,0.55)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      border: '1px solid rgba(47,43,64,0.10)',
      boxShadow: '0 1px 6px rgba(47,43,64,0.06)',
      transition: 'box-shadow 0.2s, opacity 0.2s',
      opacity: disabled ? 0.6 : 1,
    }}>

      {/* Thumbnail or icon */}
      {preview ? (
        <img
          src={preview}
          alt={file.name}
          style={{
            width: '44px', height: '44px', objectFit: 'cover',
            borderRadius: '8px', flexShrink: 0,
            border: '1px solid rgba(47,43,64,0.12)',
          }}
        />
      ) : (
        <div style={{
          width: '44px', height: '44px', borderRadius: '8px', flexShrink: 0,
          background: `${identified.color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px',
        }}>
          {identified.icon}
        </div>
      )}

      {/* File info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <span style={{
          fontSize: '0.88rem', fontWeight: 600,
          color: 'var(--color-accent)',
          fontFamily: "'ADLaM Display', cursive",
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {file.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Type badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.04em',
            color: identified.color,
            background: `${identified.color}18`,
            border: `1px solid ${identified.color}30`,
            padding: '2px 8px', borderRadius: '999px',
          }}>
            {identified.icon} {identified.label}
          </span>
          {/* File size */}
          <span style={{ fontSize: '0.72rem', color: 'var(--color-text)', opacity: 0.5 }}>
            {formatBytes(file.size)}
          </span>
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={e => { e.stopPropagation(); onRemove() }}
        aria-label={`Remove ${file.name}`}
        disabled={disabled}
        style={{
          background: 'none', border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          color: 'var(--color-accent)', opacity: disabled ? 0.15 : 0.35, fontSize: '18px',
          lineHeight: 1, padding: '4px', borderRadius: '6px',
          transition: 'opacity 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => !disabled && (e.currentTarget.style.opacity = '0.8')}
        onMouseLeave={e => !disabled && (e.currentTarget.style.opacity = '0.35')}
      >
        ✕
      </button>
    </div>
  )
}
