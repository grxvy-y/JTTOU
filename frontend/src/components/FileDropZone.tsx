import { useCallback, useEffect, useRef, useState } from 'react'
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

  if (type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'jfif', 'pjpeg', 'gif', 'bmp', 'svg'].includes(ext))
    return { label: 'Image',       icon: '🖼️',  color: '#7c6fa0' }
  if (type === 'application/pdf' || ext === 'pdf')
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

// ─── Easing constant ─────────────────────────────────────────────────────────
const ease = 'cubic-bezier(0.4, 0, 0.2, 1)'

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
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    const isImg = file.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'jfif', 'pjpeg', 'gif', 'bmp'].includes(ext)
    const preview = isImg
      ? URL.createObjectURL(file)
      : null
    return { id: uid(), file, preview, identified: identifyFile(file) }
  }, [])

  // Add files — deduplicates by name+size and clears any previous upload error state
  const addFiles = useCallback((raw: FileList | File[]) => {
    const incoming = Array.from(raw)
    setEntries(prev => {
      const existing = new Set(prev.map(e => `${e.file.name}::${e.file.size}`))
      const fresh = incoming
        .filter(f => !existing.has(`${f.name}::${f.size}`))
        .map(buildEntry)
      return [...prev, ...fresh]
    })
    // Reset upload status and summary when new files are dropped!
    setUploadStatus('idle')
    setUploadSummary(null)
  }, [buildEntry])

  // Support ?demo=1 query parameter to demonstrate / test the layout transition and right panel
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('demo') === '1') {
      const demoFiles = [
        new File(['mock schedule image content'], 'october_roster_screenshot.png', { type: 'image/png' }),
        new File(['mock schedule pdf content'], 'shifts_weekly_overview.pdf', { type: 'application/pdf' }),
        new File(['mock text notes content'], 'shift_swap_notes.txt', { type: 'text/plain' }),
      ]
      addFiles(demoFiles)
    }
  }, [addFiles])

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

  // ── Derived state ──
  const hasFiles = entries.length > 0
  const isUploading = uploadStatus === 'uploading'
  const progressPct = uploadProgress.total > 0
    ? Math.round((uploadProgress.completed / uploadProgress.total) * 100)
    : 0

  // ── Dropzone styles ──
  const zone: React.CSSProperties = {
    border: `2px dashed ${dragging ? 'var(--color-accent)' : 'rgba(47,43,64,0.25)'}`,
    borderRadius: '20px',
    padding: hasFiles ? '32px 24px' : '48px 32px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: `border-color 0.2s, background 0.2s, padding 0.5s ${ease}`,
    background: dragging
      ? 'rgba(47,43,64,0.07)'
      : 'rgba(254,250,255,0.35)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    userSelect: 'none',
    width: '100%',
  }

  return (
    <>
      {/* ── Scoped CSS for animations & responsive ── */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fdz-slideIn {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes fdz-cardIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fdz-right-panel {
          animation: fdz-slideIn 0.55s ${ease} both;
        }
        .fdz-file-card {
          animation: fdz-cardIn 0.3s ${ease} both;
        }
        .fdz-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .fdz-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .fdz-scroll::-webkit-scrollbar-thumb {
          background: rgba(47,43,64,0.12);
          border-radius: 999px;
        }
        .fdz-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(47,43,64,0.25);
        }
        @media (max-width: 768px) {
          .fdz-container.fdz-expanded {
            flex-direction: column !important;
            max-width: 680px !important;
          }
          .fdz-left.fdz-expanded {
            align-items: center !important;
            text-align: center !important;
          }
          .fdz-heading.fdz-expanded {
            align-items: center !important;
          }
        }
      `}</style>

      {/* ── Main container — transitions between centered / split layout ── */}
      <section
        className={`fdz-container ${hasFiles ? 'fdz-expanded' : ''}`}
        style={{
          width: '100%',
          maxWidth: hasFiles ? '1080px' : '680px',
          display: 'flex',
          flexDirection: hasFiles ? 'row' : 'column',
          alignItems: hasFiles ? 'flex-start' : 'center',
          gap: hasFiles ? '36px' : '24px',
          transition: `max-width 0.6s ${ease}, gap 0.6s ${ease}`,
        }}
      >
        {/* ═══ LEFT COLUMN: Heading + Dropzone ═══ */}
        <div
          className={`fdz-left ${hasFiles ? 'fdz-expanded' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: hasFiles ? 'flex-start' : 'center',
            textAlign: hasFiles ? 'left' as const : 'center' as const,
            gap: hasFiles ? '18px' : '24px',
            flex: hasFiles ? '0 0 46%' : '1 1 100%',
            minWidth: 0,
            transition: `all 0.6s ${ease}`,
          }}
        >
          {/* ── Heading group ── */}
          <div
            className={`fdz-heading ${hasFiles ? 'fdz-expanded' : ''}`}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              alignItems: hasFiles ? 'flex-start' : 'center',
              transition: `all 0.6s ${ease}`,
            }}
          >
            <p style={{
              fontSize: '0.72rem', letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--color-accent)', opacity: 0.55, margin: 0,
            }}>
              JTTOU
            </p>
            <h1 style={{
              fontSize: hasFiles ? 'clamp(1.5rem, 3.5vw, 2.2rem)' : 'clamp(2rem, 5vw, 3.2rem)',
              fontWeight: 400,
              color: 'var(--color-accent)',
              margin: 0,
              lineHeight: 1.15,
              transition: `font-size 0.6s ${ease}`,
            }}>
              Upload screenshot(s)
            </h1>
            <p style={{
              fontSize: hasFiles ? '0.88rem' : '1rem',
              color: 'var(--color-text)',
              maxWidth: '420px',
              lineHeight: 1.65,
              opacity: 0.7,
              margin: 0,
              transition: `font-size 0.6s ${ease}`,
            }}>
              Drop your schedule screenshots/files here — the AI will read them and extract for pookie 🩷
            </p>
          </div>

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
              width: hasFiles ? '48px' : '64px', height: hasFiles ? '48px' : '64px',
              borderRadius: hasFiles ? '12px' : '16px',
              background: 'rgba(47,43,64,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: hasFiles ? '22px' : '28px',
              transition: `all 0.3s ${ease}`,
              transform: dragging ? 'scale(1.12)' : 'scale(1)',
            }}>
              {dragging ? '📂' : '📁'}
            </div>

            <p style={{ margin: 0, fontFamily: "'ADLaM Display', cursive", fontSize: hasFiles ? '0.92rem' : '1.05rem', color: 'var(--color-accent)', transition: `font-size 0.5s ${ease}` }}>
              {dragging ? 'Drop to upload' : (hasFiles ? 'Drop more files here' : 'Drop files here, or click to browse')}
            </p>
            {!hasFiles && (
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-text)', opacity: 0.55 }}>
                Images, PDFs, text files — multiple allowed
              </p>
            )}

            {/* Hidden file input */}
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/*,.jfif,.jpg,.jpeg,.png,.webp,.pjpeg,application/pdf,.txt,.csv,.xls,.xlsx"
              style={{ display: 'none' }}
              onChange={onInputChange}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* ═══ RIGHT COLUMN: File Panel ═══ */}
        {hasFiles && (
          <div
            className="fdz-right-panel"
            style={{
              flex: '1',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              padding: '20px',
              borderRadius: '20px',
              background: 'rgba(254,250,255,0.45)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(47,43,64,0.10)',
              boxShadow: '0 4px 28px rgba(47,43,64,0.06)',
            }}
          >
            {/* ── Header: count + clear ── */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingBottom: '8px',
              borderBottom: '1px solid rgba(47,43,64,0.08)',
            }}>
              <span style={{
                fontSize: '0.82rem', color: 'var(--color-accent)', opacity: 0.75,
                fontFamily: "'ADLaM Display', cursive",
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: '22px', height: '22px', borderRadius: '7px',
                  background: 'rgba(47,43,64,0.10)',
                  fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-accent)',
                }}>
                  {entries.length}
                </span>
                file{entries.length !== 1 ? 's' : ''} added
              </span>
              <button
                onClick={clearAll}
                disabled={isUploading}
                style={{
                  background: 'none', border: 'none',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  fontSize: '0.72rem', color: 'var(--color-accent)',
                  opacity: isUploading ? 0.3 : 0.5,
                  fontFamily: "'ADLaM Display', cursive",
                  padding: '4px 10px', borderRadius: '8px',
                  transition: 'opacity 0.15s, background 0.15s',
                }}
                onMouseEnter={e => {
                  if (!isUploading) {
                    e.currentTarget.style.opacity = '1'
                    e.currentTarget.style.background = 'rgba(47,43,64,0.06)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isUploading) {
                    e.currentTarget.style.opacity = '0.5'
                    e.currentTarget.style.background = 'none'
                  }
                }}
              >
                Clear all
              </button>
            </div>

            {/* ── Scrollable file list ── */}
            <div
              className="fdz-scroll"
              style={{
                display: 'flex', flexDirection: 'column', gap: '8px',
                maxHeight: '300px',
                overflowY: 'auto',
                paddingRight: '4px',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(47,43,64,0.12) transparent',
              }}
            >
              {entries.map((entry, i) => (
                <div key={entry.id} className="fdz-file-card" style={{ animationDelay: `${i * 0.05}s` }}>
                  <FileCard entry={entry} onRemove={() => removeEntry(entry.id)} disabled={isUploading} />
                </div>
              ))}
            </div>

            {/* ── Upload progress bar ── */}
            {isUploading && (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '8px',
                padding: '14px 16px',
                borderRadius: '12px',
                background: 'rgba(47,43,64,0.04)',
                border: '1px solid rgba(47,43,64,0.08)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.78rem', color: 'var(--color-accent)',
                    fontFamily: "'ADLaM Display', cursive",
                  }}>
                    Analyzing {uploadProgress.currentFile}…
                  </span>
                  <span style={{
                    fontSize: '0.7rem', color: 'var(--color-accent)', opacity: 0.6,
                  }}>
                    {uploadProgress.completed}/{uploadProgress.total}
                  </span>
                </div>
                <div style={{
                  height: '5px', borderRadius: '999px',
                  background: 'rgba(47,43,64,0.08)',
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
                padding: '14px 16px',
                borderRadius: '12px',
                background: uploadStatus === 'error'
                  ? 'rgba(176,90,122,0.10)'
                  : 'rgba(90,138,106,0.10)',
                border: `1px solid ${uploadStatus === 'error' ? 'rgba(176,90,122,0.20)' : 'rgba(90,138,106,0.20)'}`,
                display: 'flex', flexDirection: 'column', gap: '4px',
              }}>
                <span style={{
                  fontSize: '0.82rem', fontFamily: "'ADLaM Display', cursive",
                  color: uploadStatus === 'error' ? '#b05a7a' : '#5a8a6a',
                  fontWeight: 600,
                }}>
                  {uploadStatus === 'error'
                    ? '⚠️ Upload failed'
                    : `✨ ${uploadSummary.totalShifts} date${uploadSummary.totalShifts !== 1 ? 's' : ''} extracted`
                  }
                </span>
                {uploadSummary.totalDaysOff > 0 && uploadStatus === 'done' && (
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-accent)', opacity: 0.65 }}>
                    Including {uploadSummary.totalDaysOff} day{uploadSummary.totalDaysOff !== 1 ? 's' : ''} off 🩷
                  </span>
                )}
                {uploadSummary.failedCount > 0 && (
                  <span style={{ fontSize: '0.74rem', color: '#b05a7a', opacity: 0.8 }}>
                    {uploadSummary.failedCount} file{uploadSummary.failedCount !== 1 ? 's' : ''} failed
                  </span>
                )}
              </div>
            )}

            {/* ── Submit / Confirm button ── */}
            {uploadStatus !== 'done' && (
              <button
                id="submit-files-btn"
                onClick={handleSubmit}
                disabled={isUploading}
                style={{
                  padding: '12px 28px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  fontFamily: "'ADLaM Display', cursive",
                  fontSize: '0.92rem',
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
                  width: '100%',
                  marginTop: '2px',
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
          </div>
        )}
      </section>
    </>
  )
}

// ─── FileCard sub-component ───────────────────────────────────────────────────

function FileCard({ entry, onRemove, disabled }: { entry: FileEntry; onRemove: () => void; disabled?: boolean }) {
  const { file, preview, identified } = entry
  const [imgError, setImgError] = useState(false)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '10px 14px',
      borderRadius: '12px',
      background: 'rgba(254,250,255,0.6)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      border: '1px solid rgba(47,43,64,0.08)',
      boxShadow: '0 1px 4px rgba(47,43,64,0.04)',
      transition: 'box-shadow 0.2s, opacity 0.2s',
      opacity: disabled ? 0.6 : 1,
    }}>

      {/* Thumbnail or icon */}
      {preview && !imgError ? (
        <img
          src={preview}
          alt={file.name}
          onError={() => setImgError(true)}
          style={{
            width: '40px', height: '40px', objectFit: 'cover',
            borderRadius: '8px', flexShrink: 0,
            border: '1px solid rgba(47,43,64,0.10)',
          }}
        />
      ) : (
        <div style={{
          width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0,
          background: `${identified.color}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '20px',
        }}>
          {identified.icon}
        </div>
      )}

      {/* File info */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span style={{
          fontSize: '0.82rem', fontWeight: 600,
          color: 'var(--color-accent)',
          fontFamily: "'ADLaM Display', cursive",
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {file.name}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Type badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '3px',
            fontSize: '0.64rem', fontWeight: 600, letterSpacing: '0.04em',
            color: identified.color,
            background: `${identified.color}18`,
            border: `1px solid ${identified.color}30`,
            padding: '1px 7px', borderRadius: '999px',
          }}>
            {identified.icon} {identified.label}
          </span>
          {/* File size */}
          <span style={{ fontSize: '0.68rem', color: 'var(--color-text)', opacity: 0.5 }}>
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
          color: 'var(--color-accent)', opacity: disabled ? 0.15 : 0.35, fontSize: '16px',
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
