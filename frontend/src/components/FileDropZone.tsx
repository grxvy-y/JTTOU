import { useCallback, useRef, useState } from 'react'

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
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.75rem', color: 'var(--color-accent)', opacity: 0.5,
                fontFamily: "'ADLaM Display', cursive",
                padding: '4px 8px', borderRadius: '8px',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
            >
              Clear all
            </button>
          </div>

          {/* Individual file cards */}
          {entries.map(entry => (
            <FileCard key={entry.id} entry={entry} onRemove={() => removeEntry(entry.id)} />
          ))}
        </div>
      )}
    </section>
  )
}

// ─── FileCard sub-component ───────────────────────────────────────────────────

function FileCard({ entry, onRemove }: { entry: FileEntry; onRemove: () => void }) {
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
      transition: 'box-shadow 0.2s',
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
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--color-accent)', opacity: 0.35, fontSize: '18px',
          lineHeight: 1, padding: '4px', borderRadius: '6px',
          transition: 'opacity 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.35')}
      >
        ✕
      </button>
    </div>
  )
}
