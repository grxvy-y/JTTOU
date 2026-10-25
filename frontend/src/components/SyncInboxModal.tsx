import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

interface SyncInboxModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function SyncInboxModal({ isOpen, onClose }: SyncInboxModalProps) {
  const {
    currentUser,
    outgoingSyncRequests,
    incomingSyncRequests,
    sendSyncInvite,
    acceptSyncInvite,
    declineSyncInvite,
    disconnectSync,
  } = useAuth()
  const [targetUsername, setTargetUsername] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen || !currentUser) return null

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)
    if (!targetUsername.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a target username.' })
      return
    }

    setSubmitting(true)
    const res = sendSyncInvite(targetUsername.trim())
    setSubmitting(false)

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Sync invite sent to @${targetUsername.trim()}! Request ID: ${res.requestId}`,
      })
      setTargetUsername('')
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to dispatch sync invite.' })
    }
  }

  const handleAcceptInvite = (reqId: string, senderName: string) => {
    setFeedback(null)
    const res = acceptSyncInvite(reqId)
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Successfully accepted sync invite! You are now Synced with @${senderName}.`,
      })
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to accept invitation.' })
    }
  }

  const handleDeclineInvite = (reqId: string, senderName: string) => {
    setFeedback(null)
    const res = declineSyncInvite(reqId)
    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Declined sync invitation from @${senderName}.`,
      })
    } else {
      setFeedback({ type: 'error', message: res.error || 'Failed to decline invitation.' })
    }
  }

  const pendingSent = outgoingSyncRequests.filter(r => r.status === 'pending')

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(47, 43, 64, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        padding: '20px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        id="sync-inbox-modal"
        style={{
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          background: 'rgba(254, 250, 255, 0.98)',
          borderRadius: '24px',
          border: '1px solid rgba(47, 43, 64, 0.12)',
          boxShadow: '0 20px 50px rgba(47, 43, 64, 0.20)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          fontFamily: "'ADLaM Display', cursive",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(47, 43, 64, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(233, 185, 202, 0.20)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🔄</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-accent)' }}>
                Sync Inbox
              </h2>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--color-text)', opacity: 0.7 }}>
                Mutual schedule sharing under Standard Level Privacy Policy
              </p>
            </div>
          </div>
          <button
            id="close-sync-inbox-modal"
            onClick={onClose}
            aria-label="Close Sync Inbox modal"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer',
              color: 'var(--color-accent)',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Active Synced Partner indicator if any */}
          {currentUser.syncedWith && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '14px',
                background: 'rgba(122, 154, 90, 0.12)',
                border: '1px solid rgba(122, 154, 90, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                fontSize: '0.85rem',
                color: '#415e24',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🛡️</span>
                <span>Currently <strong>Synced with @{currentUser.syncedWith}</strong> (Standard Privacy).</span>
              </div>
              <button
                id="disconnect-sync-btn"
                type="button"
                onClick={() => {
                  const partner = currentUser.syncedWith
                  disconnectSync()
                  setFeedback({ type: 'success', message: `Calendar synchronization with @${partner} has been disconnected.` })
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(176, 90, 122, 0.35)',
                  background: 'rgba(176, 90, 122, 0.08)',
                  color: '#b05a7a',
                  fontFamily: 'inherit',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(176, 90, 122, 0.18)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(176, 90, 122, 0.08)'
                }}
              >
                Disconnect
              </button>
            </div>
          )}

          {/* Section: Invite a Fellow User */}
          <div
            style={{
              background: 'rgba(47, 43, 64, 0.03)',
              borderRadius: '16px',
              padding: '18px',
              border: '1px solid rgba(47, 43, 64, 0.08)',
            }}
          >
            <h3 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'var(--color-accent)' }}>
              Invite a Fellow User to Sync
            </h3>
            <p style={{ margin: '0 0 14px 0', fontSize: '0.78rem', color: 'var(--color-text)', opacity: 0.75 }}>
              Enter the username of another registered user to request schedule synchronization.
            </p>

            <form onSubmit={handleSendInvite} style={{ display: 'flex', gap: '10px' }}>
              <input
                id="sync-target-username-input"
                type="text"
                placeholder="Username (e.g. bob or demo)"
                value={targetUsername}
                onChange={e => setTargetUsername(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(47, 43, 64, 0.20)',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <button
                id="send-sync-invite-btn"
                type="submit"
                disabled={submitting}
                style={{
                  padding: '10px 18px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--color-accent)',
                  color: '#fff',
                  fontSize: '0.84rem',
                  fontFamily: 'inherit',
                  cursor: submitting ? 'wait' : 'pointer',
                  boxShadow: '0 2px 8px rgba(47, 43, 64, 0.15)',
                  transition: 'opacity 0.2s',
                }}
              >
                Send Invite
              </button>
            </form>

            {feedback && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  backgroundColor: feedback.type === 'success' ? 'rgba(122, 154, 90, 0.15)' : 'rgba(176, 90, 122, 0.15)',
                  color: feedback.type === 'success' ? '#3d611f' : '#b05a7a',
                  border: `1px solid ${feedback.type === 'success' ? 'rgba(122, 154, 90, 0.3)' : 'rgba(176, 90, 122, 0.3)'}`,
                }}
              >
                {feedback.message}
              </div>
            )}
          </div>

          {/* Section: Incoming Sync Invites */}
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--color-accent)' }}>
              Incoming Sync Invites ({incomingSyncRequests.length})
            </h3>
            {incomingSyncRequests.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text)', opacity: 0.6, fontStyle: 'italic' }}>
                No incoming sync requests at this time.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {incomingSyncRequests.map(req => (
                  <div
                    key={req.id}
                    id={`incoming-invite-${req.id}`}
                    style={{
                      padding: '14px',
                      borderRadius: '14px',
                      background: 'rgba(254, 250, 255, 0.90)',
                      border: '1px solid rgba(47, 43, 64, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: '0.86rem', color: 'var(--color-accent)', fontWeight: 600 }}>
                        Invite from @{req.senderUsername}
                      </p>
                      <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--color-text)', opacity: 0.6 }}>
                        ID: {req.id} • Standard Privacy
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        id={`accept-invite-${req.id}`}
                        onClick={() => handleAcceptInvite(req.id, req.senderUsername)}
                        title="Accept sync invite"
                        aria-label="Accept sync invite"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          border: 'none',
                          background: '#7a9a5a',
                          color: '#ffffff',
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(122, 154, 90, 0.3)',
                          transition: 'transform 0.15s, background 0.15s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'scale(1.08)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'scale(1)'
                        }}
                      >
                        ✓
                      </button>
                      <button
                        id={`decline-invite-${req.id}`}
                        onClick={() => handleDeclineInvite(req.id, req.senderUsername)}
                        title="Decline sync invite"
                        aria-label="Decline sync invite"
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          border: '1px solid rgba(176, 90, 122, 0.35)',
                          background: 'rgba(176, 90, 122, 0.08)',
                          color: '#b05a7a',
                          fontSize: '1rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.15s, background 0.15s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.transform = 'scale(1.08)'
                          e.currentTarget.style.background = 'rgba(176, 90, 122, 0.15)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.transform = 'scale(1)'
                          e.currentTarget.style.background = 'rgba(176, 90, 122, 0.08)'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Pending sent requests */}
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: 'var(--color-accent)' }}>
              Pending sent requests
            </h3>
            {pendingSent.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text)', opacity: 0.6, fontStyle: 'italic' }}>
                No outgoing pending requests.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingSent.map(req => (
                  <div
                    key={req.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'rgba(47, 43, 64, 0.04)',
                      border: '1px solid rgba(47, 43, 64, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '0.82rem',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>@{req.recipientUsername}</span>
                      <span style={{ marginLeft: '8px', fontSize: '0.72rem', opacity: 0.6 }}>ID: {req.id}</span>
                    </div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        background: 'rgba(233, 185, 202, 0.40)',
                        color: 'var(--color-accent)',
                      }}
                    >
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
