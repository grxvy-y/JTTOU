import type { UserProfile } from '../types/auth'

interface PrivacyPolicyModalProps {
  isOpen: boolean
  onClose: () => void
  user?: UserProfile | null
  onAccept?: () => void
  showAcceptButton?: boolean
}

export default function PrivacyPolicyModal({
  isOpen,
  onClose,
  user,
  onAccept,
  showAcceptButton = false,
}: PrivacyPolicyModalProps) {
  if (!isOpen) return null

  const effectiveDate = user?.privacyPolicy?.acceptedAt
    ? new Date(user.privacyPolicy.acceptedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        backgroundColor: 'rgba(47, 43, 64, 0.50)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        animation: 'fadeIn 0.25s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'rgba(254, 250, 255, 0.98)',
          borderRadius: '24px',
          padding: '28px 28px',
          border: '1px solid rgba(47, 43, 64, 0.12)',
          boxShadow: '0 20px 50px rgba(47, 43, 64, 0.24)',
          fontFamily: "'ADLaM Display', cursive",
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
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
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
        >
          ✕
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: '18px', paddingRight: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              background: 'rgba(124, 111, 160, 0.12)',
              border: '1px solid rgba(124, 111, 160, 0.22)',
              fontSize: '0.74rem',
              color: 'var(--color-accent)',
              marginBottom: '10px',
            }}
          >
            <span>🛡️</span>
            <span>Standard Level Privacy Tier</span>
          </div>

          <h2 style={{ margin: '0 0 6px', fontSize: '1.35rem', color: 'var(--color-accent)' }}>
            Standard Level Privacy Policy
          </h2>

          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text)', opacity: 0.7 }}>
            {user
              ? `Personalized Policy for @${user.username} (${user.firstName} ${user.lastName}) • Effective: ${effectiveDate}`
              : `Standard policy provision applied to all newly registered user accounts • Effective: ${effectiveDate}`}
          </p>
        </div>

        {/* Scrollable Policy Content */}
        <div
          style={{
            overflowY: 'auto',
            paddingRight: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            fontSize: '0.82rem',
            color: 'var(--color-text)',
            lineHeight: 1.55,
          }}
        >
          {/* Section 1 */}
          <div
            style={{
              background: 'rgba(47, 43, 64, 0.04)',
              borderRadius: '14px',
              padding: '14px',
              border: '1px solid rgba(47, 43, 64, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.1rem' }}>🔒</span>
              <strong style={{ color: 'var(--color-accent)', fontSize: '0.88rem' }}>
                1. Isolation of Personal Shifts & Private Notes
              </strong>
            </div>
            <p style={{ margin: 0, opacity: 0.85 }}>
              Your personal calendar events, custom shift notes, personal off-work activities, and customized emojis are strictly confidential. Under your Standard Level policy, personal events are <strong>never</strong> shared with calendar sync partners or exported without your explicit consent.
            </p>
          </div>

          {/* Section 2 */}
          <div
            style={{
              background: 'rgba(47, 43, 64, 0.04)',
              borderRadius: '14px',
              padding: '14px',
              border: '1px solid rgba(47, 43, 64, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.1rem' }}>🤝</span>
              <strong style={{ color: 'var(--color-accent)', fontSize: '0.88rem' }}>
                2. Consensual Peer-to-Peer Calendar Synchronization
              </strong>
            </div>
            <p style={{ margin: 0, opacity: 0.85 }}>
              Schedule synchronization with fellow registered users operates strictly on mutual consent. Synchronization only occurs when you type the specific username of a fellow user to dispatch a unique sync invite, and that recipient explicitly accepts the invitation in their Sync Inbox. Either party may disconnect at any time.
            </p>
          </div>

          {/* Section 3 */}
          <div
            style={{
              background: 'rgba(47, 43, 64, 0.04)',
              borderRadius: '14px',
              padding: '14px',
              border: '1px solid rgba(47, 43, 64, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.1rem' }}>🌤️</span>
              <strong style={{ color: 'var(--color-accent)', fontSize: '0.88rem' }}>
                3. Weather & Location Transparency
              </strong>
            </div>
            <p style={{ margin: 0, opacity: 0.85 }}>
              Location information (such as your city and province) is utilized exclusively to fetch local weather forecasts on your scheduled days off. Your location is never tracked continuously or shared with other users.
            </p>
          </div>

          {/* Section 4 */}
          <div
            style={{
              background: 'rgba(47, 43, 64, 0.04)',
              borderRadius: '14px',
              padding: '14px',
              border: '1px solid rgba(47, 43, 64, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '1.1rem' }}>🗃️</span>
              <strong style={{ color: 'var(--color-accent)', fontSize: '0.88rem' }}>
                4. Data Ownership & Disconnection Rights
              </strong>
            </div>
            <p style={{ margin: 0, opacity: 0.85 }}>
              You retain total control over your schedule data. You can unlink your calendar from any user in your account settings or log out to clear local session memory at will.
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
            paddingTop: '12px',
            borderTop: '1px solid rgba(47, 43, 64, 0.08)',
          }}
        >
          {showAcceptButton && onAccept ? (
            <>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: '1px solid rgba(47, 43, 64, 0.16)',
                  background: 'transparent',
                  color: 'var(--color-accent)',
                  fontFamily: "'ADLaM Display', cursive",
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  onAccept()
                  onClose()
                }}
                style={{
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #2f2b40 0%, #5a4a6a 100%)',
                  color: '#FEFAFF',
                  fontFamily: "'ADLaM Display', cursive",
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(47, 43, 64, 0.18)',
                }}
              >
                Accept Standard Policy & Continue
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '11px 20px',
                borderRadius: '12px',
                border: 'none',
                background: 'var(--color-accent)',
                color: '#FEFAFF',
                fontFamily: "'ADLaM Display', cursive",
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              Close Privacy Policy
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
