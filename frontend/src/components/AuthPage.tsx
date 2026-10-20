import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import type { UserRole } from '../types/auth'
import jttouLogo from '../assets/JTTOU.svg'

type AuthMode = 'login' | 'signup'

const ease = 'cubic-bezier(0.4, 0, 0.2, 1)'

export default function AuthPage() {
  const { loginAsAdmin, loginAsPookie, loginAsUser, registerUser } = useAuth()

  // Default role is 'user' (JTTOU registered user)
  const [selectedRole, setSelectedRole] = useState<UserRole>('user')
  const [authMode, setAuthMode] = useState<AuthMode>('login')

  // Form fields
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [country, setCountry] = useState('')
  const [province, setProvince] = useState('')

  // UI state
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Switch role handler: resets inputs and errors
  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role)
    setError(null)
    setPassword('')
    if (role !== 'user') {
      setAuthMode('login')
    }
  }

  // Handle Login submission
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (selectedRole === 'admin') {
        const res = loginAsAdmin(password)
        if (!res.success) setError(res.error || 'Invalid admin credentials')
      } else if (selectedRole === 'pookie') {
        const res = loginAsPookie(password)
        if (!res.success) setError(res.error || 'Invalid pookie credentials')
      } else {
        const res = loginAsUser(username, password)
        if (!res.success) setError(res.error || 'Invalid username or password')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Sign Up submission
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim() || !password.trim() || !firstName.trim() || !lastName.trim()) {
      setError('Please fill in all required fields (Username, Password, First & Last Name).')
      return
    }

    setSubmitting(true)
    try {
      const res = registerUser({
        username,
        password,
        firstName,
        lastName,
        country,
        province,
      })
      if (!res.success) {
        setError(res.error || 'Registration failed')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '32px 20px',
        boxSizing: 'border-box',
        overflow: 'hidden',
        fontFamily: "'ADLaM Display', cursive",
      }}
    >
      {/* Background ambient lighting */}
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          top: '-15%',
          left: '-10%',
          width: '55vw',
          height: '55vw',
          borderRadius: '50%',
          background: 'rgba(254, 250, 255, 0.35)',
          filter: 'blur(130px)',
        }}
      />
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '55vw',
          height: '55vw',
          borderRadius: '50%',
          background: 'rgba(250, 241, 232, 0.40)',
          filter: 'blur(130px)',
        }}
      />

      {/* Main Glassmorphic Card */}
      <div
        style={{
          width: '100%',
          maxWidth: authMode === 'signup' ? '480px' : '440px',
          background: 'rgba(254, 250, 255, 0.55)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(47, 43, 64, 0.12)',
          borderRadius: '24px',
          padding: '36px 32px',
          boxShadow: '0 8px 36px rgba(47, 43, 64, 0.08), 0 2px 8px rgba(47, 43, 64, 0.04)',
          position: 'relative',
          zIndex: 2,
          transition: `all 0.4s ${ease}`,
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src={jttouLogo}
            alt="JTTOU Logo"
            style={{ height: '36px', width: 'auto', margin: '0 auto 10px', display: 'block' }}
          />
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 400,
              color: 'var(--color-accent)',
              margin: '0 0 6px',
              letterSpacing: '0.02em',
            }}
          >
            {authMode === 'signup' ? 'Create Account' : 'Welcome to JTTOU'}
          </h1>
          <p
            style={{
              fontSize: '0.84rem',
              color: 'var(--color-text)',
              opacity: 0.68,
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            {authMode === 'signup'
              ? 'Join to access your personalized schedule & preview admin availability'
              : 'Sign in to access your roster, calendar, and schedule sync'}
          </p>
        </div>

        {/* ── 3 Role Icon Indicators (Visible on Login) ── */}
        {authMode === 'login' && (
          <div style={{ marginBottom: '22px' }}>
            <p
              style={{
                fontSize: '0.72rem',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--color-accent)',
                opacity: 0.6,
                margin: '0 0 10px',
                textAlign: 'center',
              }}
            >
              Select Login Role
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                background: 'rgba(47, 43, 64, 0.05)',
                padding: '5px',
                borderRadius: '16px',
                border: '1px solid rgba(47, 43, 64, 0.08)',
              }}
            >
              {/* 1. Admin */}
              <button
                type="button"
                id="role-btn-admin"
                onClick={() => handleRoleSelect('admin')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '10px 6px',
                  borderRadius: '12px',
                  border: selectedRole === 'admin' ? '1px solid rgba(124, 111, 160, 0.35)' : '1px solid transparent',
                  background: selectedRole === 'admin' ? '#FEFAFF' : 'transparent',
                  color: 'var(--color-accent)',
                  cursor: 'pointer',
                  boxShadow: selectedRole === 'admin' ? '0 2px 10px rgba(47, 43, 64, 0.08)' : 'none',
                  transition: `all 0.25s ${ease}`,
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>👑</span>
                <span style={{ fontSize: '0.78rem', fontFamily: "'ADLaM Display', cursive" }}>Admin</span>
              </button>

              {/* 2. JTTOU User (DEFAULT) */}
              <button
                type="button"
                id="role-btn-user"
                onClick={() => handleRoleSelect('user')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '10px 6px',
                  borderRadius: '12px',
                  border: selectedRole === 'user' ? '1px solid rgba(124, 111, 160, 0.35)' : '1px solid transparent',
                  background: selectedRole === 'user' ? '#FEFAFF' : 'transparent',
                  color: 'var(--color-accent)',
                  cursor: 'pointer',
                  boxShadow: selectedRole === 'user' ? '0 2px 10px rgba(47, 43, 64, 0.08)' : 'none',
                  transition: `all 0.25s ${ease}`,
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>👤</span>
                <span style={{ fontSize: '0.78rem', fontFamily: "'ADLaM Display', cursive" }}>JTTOU User</span>
              </button>

              {/* 3. Pookie */}
              <button
                type="button"
                id="role-btn-pookie"
                onClick={() => handleRoleSelect('pookie')}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '10px 6px',
                  borderRadius: '12px',
                  border: selectedRole === 'pookie' ? '1px solid rgba(124, 111, 160, 0.35)' : '1px solid transparent',
                  background: selectedRole === 'pookie' ? '#FEFAFF' : 'transparent',
                  color: 'var(--color-accent)',
                  cursor: 'pointer',
                  boxShadow: selectedRole === 'pookie' ? '0 2px 10px rgba(47, 43, 64, 0.08)' : 'none',
                  transition: `all 0.25s ${ease}`,
                }}
              >
                <span style={{ fontSize: '1.4rem' }}>🩷</span>
                <span style={{ fontSize: '0.78rem', fontFamily: "'ADLaM Display', cursive" }}>Pookie</span>
              </button>
            </div>
          </div>
        )}

        {/* Informational banner based on role */}
        {authMode === 'login' && selectedRole !== 'user' && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: selectedRole === 'admin' ? 'rgba(124, 111, 160, 0.10)' : 'rgba(176, 90, 122, 0.10)',
              border: `1px solid ${selectedRole === 'admin' ? 'rgba(124, 111, 160, 0.20)' : 'rgba(176, 90, 122, 0.20)'}`,
              marginBottom: '18px',
              fontSize: '0.78rem',
              color: 'var(--color-accent)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>{selectedRole === 'admin' ? '🔒' : '✨'}</span>
            <span>
              {selectedRole === 'admin'
                ? 'Admin portal — Enter your administrative master key.'
                : 'Pookie portal — Sync your shared calendars with Admin.'}
            </span>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: 'rgba(176, 90, 122, 0.12)',
              border: '1px solid rgba(176, 90, 122, 0.30)',
              color: '#b05a7a',
              fontSize: '0.8rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* ── FORM ── */}
        {authMode === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Username field (ONLY for JTTOU User) */}
            {selectedRole === 'user' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label
                  htmlFor="login-username"
                  style={{ fontSize: '0.8rem', color: 'var(--color-accent)', opacity: 0.8 }}
                >
                  Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  required
                  placeholder="Enter your username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(47, 43, 64, 0.16)',
                    background: 'rgba(254, 250, 255, 0.8)',
                    fontFamily: "'ADLaM Display', cursive",
                    fontSize: '0.9rem',
                    color: 'var(--color-accent)',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(47, 43, 64, 0.16)')}
                />
              </div>
            )}

            {/* Password field (For ALL roles) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label
                  htmlFor="login-password"
                  style={{ fontSize: '0.8rem', color: 'var(--color-accent)', opacity: 0.8 }}
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.72rem',
                    color: 'var(--color-accent)',
                    opacity: 0.6,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder={
                  selectedRole === 'admin'
                    ? 'Admin password'
                    : selectedRole === 'pookie'
                    ? 'Pookie password'
                    : 'Enter your password'
                }
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  padding: '12px 16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(47, 43, 64, 0.16)',
                  background: 'rgba(254, 250, 255, 0.8)',
                  fontFamily: "'ADLaM Display', cursive",
                  fontSize: '0.9rem',
                  color: 'var(--color-accent)',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-accent)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(47, 43, 64, 0.16)')}
              />
            </div>

            {/* Confirm button */}
            <button
              id="auth-submit-btn"
              type="submit"
              disabled={submitting}
              style={{
                marginTop: '4px',
                padding: '13px 24px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #2f2b40 0%, #5a4a6a 50%, #7c6fa0 100%)',
                color: '#FEFAFF',
                fontSize: '0.94rem',
                fontWeight: 600,
                fontFamily: "'ADLaM Display', cursive",
                letterSpacing: '0.03em',
                cursor: submitting ? 'wait' : 'pointer',
                boxShadow: '0 4px 18px rgba(47, 43, 64, 0.2)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {submitting
                ? 'Verifying…'
                : selectedRole === 'admin'
                ? 'Confirm Admin Sign In 👑'
                : selectedRole === 'pookie'
                ? 'Confirm Pookie Sign In 🩷'
                : 'Confirm & Sign In'}
            </button>

            {/* Sign up text link (underneath username and password box for JTTOU User) */}
            {selectedRole === 'user' && (
              <div style={{ textAlign: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text)', opacity: 0.65 }}>
                  Don't have an account?{' '}
                </span>
                <button
                  type="button"
                  id="switch-to-signup-btn"
                  onClick={() => {
                    setAuthMode('signup')
                    setError(null)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '0.82rem',
                    color: 'var(--color-accent)',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontFamily: "'ADLaM Display', cursive",
                  }}
                >
                  Sign up
                </button>
              </div>
            )}
          </form>
        ) : (
          /* ── SIGN UP FORM ── */
          <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* First & Last Name (Required) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label htmlFor="reg-first-name" style={{ fontSize: '0.78rem', color: 'var(--color-accent)' }}>
                  First Name <span style={{ color: '#b05a7a' }}>*</span>
                </label>
                <input
                  id="reg-first-name"
                  type="text"
                  required
                  placeholder="First name"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  style={{
                    padding: '11px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(47, 43, 64, 0.16)',
                    background: 'rgba(254, 250, 255, 0.8)',
                    fontFamily: "'ADLaM Display', cursive",
                    fontSize: '0.86rem',
                    color: 'var(--color-accent)',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label htmlFor="reg-last-name" style={{ fontSize: '0.78rem', color: 'var(--color-accent)' }}>
                  Last Name <span style={{ color: '#b05a7a' }}>*</span>
                </label>
                <input
                  id="reg-last-name"
                  type="text"
                  required
                  placeholder="Last name"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  style={{
                    padding: '11px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(47, 43, 64, 0.16)',
                    background: 'rgba(254, 250, 255, 0.8)',
                    fontFamily: "'ADLaM Display', cursive",
                    fontSize: '0.86rem',
                    color: 'var(--color-accent)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Username (Required) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label htmlFor="reg-username" style={{ fontSize: '0.78rem', color: 'var(--color-accent)' }}>
                Username <span style={{ color: '#b05a7a' }}>*</span>
              </label>
              <input
                id="reg-username"
                type="text"
                required
                placeholder="Choose a username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(47, 43, 64, 0.16)',
                  background: 'rgba(254, 250, 255, 0.8)',
                  fontFamily: "'ADLaM Display', cursive",
                  fontSize: '0.86rem',
                  color: 'var(--color-accent)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Password (Required) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="reg-password" style={{ fontSize: '0.78rem', color: 'var(--color-accent)' }}>
                  Password <span style={{ color: '#b05a7a' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '0.72rem',
                    color: 'var(--color-accent)',
                    opacity: 0.6,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Create a password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: '1px solid rgba(47, 43, 64, 0.16)',
                  background: 'rgba(254, 250, 255, 0.8)',
                  fontFamily: "'ADLaM Display', cursive",
                  fontSize: '0.86rem',
                  color: 'var(--color-accent)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Country & Province (Optional) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label htmlFor="reg-country" style={{ fontSize: '0.78rem', color: 'var(--color-accent)', opacity: 0.75 }}>
                  Country <span style={{ opacity: 0.55 }}>(optional)</span>
                </label>
                <input
                  id="reg-country"
                  type="text"
                  placeholder="e.g. Canada"
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  style={{
                    padding: '11px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(47, 43, 64, 0.14)',
                    background: 'rgba(254, 250, 255, 0.8)',
                    fontFamily: "'ADLaM Display', cursive",
                    fontSize: '0.86rem',
                    color: 'var(--color-accent)',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label htmlFor="reg-province" style={{ fontSize: '0.78rem', color: 'var(--color-accent)', opacity: 0.75 }}>
                  Province / State <span style={{ opacity: 0.55 }}>(optional)</span>
                </label>
                <input
                  id="reg-province"
                  type="text"
                  placeholder="e.g. Ontario"
                  value={province}
                  onChange={e => setProvince(e.target.value)}
                  style={{
                    padding: '11px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(47, 43, 64, 0.14)',
                    background: 'rgba(254, 250, 255, 0.8)',
                    fontFamily: "'ADLaM Display', cursive",
                    fontSize: '0.86rem',
                    color: 'var(--color-accent)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* Confirm Registration Button */}
            <button
              id="confirm-signup-btn"
              type="submit"
              disabled={submitting}
              style={{
                marginTop: '6px',
                padding: '13px 24px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #2f2b40 0%, #5a4a6a 50%, #7c6fa0 100%)',
                color: '#FEFAFF',
                fontSize: '0.94rem',
                fontWeight: 600,
                fontFamily: "'ADLaM Display', cursive",
                letterSpacing: '0.03em',
                cursor: submitting ? 'wait' : 'pointer',
                boxShadow: '0 4px 18px rgba(47, 43, 64, 0.2)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {submitting ? 'Creating account…' : 'Confirm Registration & Enter ✨'}
            </button>

            {/* Back to Login link */}
            <div style={{ textAlign: 'center', marginTop: '2px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-text)', opacity: 0.65 }}>
                Already have an account?{' '}
              </span>
              <button
                type="button"
                id="back-to-login-btn"
                onClick={() => {
                  setAuthMode('login')
                  setError(null)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '0.82rem',
                  color: 'var(--color-accent)',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  fontFamily: "'ADLaM Display', cursive",
                }}
              >
                Log in
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer copyright note */}
      <p style={{ marginTop: '24px', fontSize: '0.72rem', color: 'var(--color-accent)', opacity: 0.45 }}>
        JTTOU © 2026 • Secure Role-Based Scheduling
      </p>
    </div>
  )
}
