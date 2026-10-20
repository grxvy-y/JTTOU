import { useAuth } from '../context/AuthContext'

interface MyAccountModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MyAccountModal({ isOpen, onClose }: MyAccountModalProps) {
  const { currentUser } = useAuth()

  if (!isOpen || !currentUser) return null

  const roleEmoji = currentUser.role === 'admin' ? '👑' : currentUser.role === 'pookie' ? '🩷' : '👤'
  const roleTitle = currentUser.role === 'admin' ? 'Administrator' : currentUser.role === 'pookie' ? 'Pookie (Partner)' : 'JTTOU User'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundColor: 'rgba(47, 43, 64, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'rgba(254, 250, 255, 0.95)',
          borderRadius: '24px',
          padding: '28px 28px',
          border: '1px solid rgba(47, 43, 64, 0.12)',
          boxShadow: '0 16px 48px rgba(47, 43, 64, 0.2)',
          fontFamily: "'ADLaM Display', cursive",
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            fontSize: '18px',
            cursor: 'pointer',
            color: 'var(--color-accent)',
            opacity: 0.5,
            padding: '4px 8px',
            borderRadius: '8px',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
        >
          ✕
        </button>

        {/* Header with avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'rgba(47, 43, 64, 0.08)',
              border: '1px solid rgba(47, 43, 64, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}
          >
            {roleEmoji}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-accent)' }}>
              {currentUser.firstName} {currentUser.lastName}
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--color-text)', opacity: 0.65 }}>
              @{currentUser.username} • {roleTitle}
            </p>
          </div>
        </div>

        {/* Account Details Box */}
        <div
          style={{
            background: 'rgba(47, 43, 64, 0.04)',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            border: '1px solid rgba(47, 43, 64, 0.08)',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--color-text)', opacity: 0.6 }}>Role</span>
            <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{roleTitle} {roleEmoji}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--color-text)', opacity: 0.6 }}>Username</span>
            <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{currentUser.username}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--color-text)', opacity: 0.6 }}>Name</span>
            <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
              {currentUser.firstName} {currentUser.lastName}
            </span>
          </div>

          {currentUser.country && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--color-text)', opacity: 0.6 }}>Country</span>
              <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{currentUser.country}</span>
            </div>
          )}

          {currentUser.province && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--color-text)', opacity: 0.6 }}>Province / State</span>
              <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{currentUser.province}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--color-text)', opacity: 0.6 }}>Calendar Sync</span>
            <span style={{ color: '#5a8a6a', fontWeight: 600 }}>
              {currentUser.role === 'admin'
                ? 'Master Sync (Pookie + Users)'
                : currentUser.role === 'pookie'
                ? 'Synced with Admin (2705)'
                : 'Previewing Admin Calendar'}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '12px 20px',
            borderRadius: '12px',
            border: 'none',
            background: 'var(--color-accent)',
            color: '#FEFAFF',
            fontFamily: "'ADLaM Display', cursive",
            fontSize: '0.88rem',
            cursor: 'pointer',
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Close
        </button>
      </div>
    </div>
  )
}
