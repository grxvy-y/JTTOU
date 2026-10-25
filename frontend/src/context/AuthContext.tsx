import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { UserProfile, AuthContextType, PrivacyPolicyRecord, SyncRequest } from '../types/auth'

const AUTH_STORAGE_KEY = 'jttou_auth_user'
const REGISTERED_USERS_KEY = 'jttou_registered_users'
const SYNC_STORAGE_KEY = 'jttou_sync_requests'

const ADMIN_PASSWORD = '2705'
const POOKIE_PASSWORD = '101005'

const DEFAULT_STANDARD_POLICY: PrivacyPolicyRecord = {
  tier: 'standard',
  version: '1.0',
  title: 'Standard Level Privacy Policy',
  acceptedAt: new Date().toISOString(),
  personalShiftsPrivate: true,
  scheduleSyncConsent: true,
  locationWeatherConsent: true,
}

// Seed default registered users if none exists
const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user-demo-1',
    username: 'demo',
    firstName: 'Demo',
    lastName: 'User',
    role: 'user',
    country: 'Canada',
    province: 'Ontario',
    createdAt: new Date().toISOString(),
    password: 'password123',
    privacyPolicy: DEFAULT_STANDARD_POLICY,
  },
  {
    id: 'user-bob-1',
    username: 'bob',
    firstName: 'Bob',
    lastName: 'Builder',
    role: 'user',
    country: 'Canada',
    province: 'Ontario',
    createdAt: new Date().toISOString(),
    password: 'password123',
    privacyPolicy: DEFAULT_STANDARD_POLICY,
  },
]

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY)
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  // Support ?logout=1 query parameter to log out immediately (helpful for testing and direct logout links)
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('logout') === '1') {
      logout()
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Ensure default registered users exist in storage and backfill standard privacy policy
  useEffect(() => {
    try {
      const existing = localStorage.getItem(REGISTERED_USERS_KEY)
      if (!existing) {
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(DEFAULT_USERS))
      } else {
        const parsed: UserProfile[] = JSON.parse(existing)
        let changed = false
        const updated = parsed.map(u => {
          if (!u.privacyPolicy) {
            changed = true
            return { ...u, privacyPolicy: { ...DEFAULT_STANDARD_POLICY, acceptedAt: u.createdAt || new Date().toISOString() } }
          }
          return u
        })
        if (changed) {
          localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updated))
        }
      }
    } catch (e) {
      console.warn('Failed to initialize registered users', e)
    }
  }, [])

  const saveSession = (user: UserProfile) => {
    setCurrentUser(user)
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user))
    } catch (e) {
      console.warn('Failed to save auth session', e)
    }
  }

  const loginAsAdmin = (password: string) => {
    if (password.trim() === ADMIN_PASSWORD) {
      const adminUser: UserProfile = {
        id: 'admin-root',
        username: 'admin',
        firstName: 'Admin',
        lastName: 'Manager',
        role: 'admin',
        createdAt: new Date().toISOString(),
        privacyPolicy: DEFAULT_STANDARD_POLICY,
      }
      saveSession(adminUser)
      return { success: true }
    }
    return { success: false, error: 'Incorrect Admin password. (Password is 2705)' }
  }

  const loginAsPookie = (password: string) => {
    if (password.trim() === POOKIE_PASSWORD) {
      const pookieUser: UserProfile = {
        id: 'pookie-partner',
        username: 'pookie',
        firstName: 'Pookie',
        lastName: '🩷',
        role: 'pookie',
        createdAt: new Date().toISOString(),
        privacyPolicy: DEFAULT_STANDARD_POLICY,
      }
      saveSession(pookieUser)
      return { success: true }
    }
    return { success: false, error: 'Incorrect Pookie password. (Password is 101005)' }
  }

  const loginAsUser = (username: string, password: string) => {
    const cleanUser = username.trim().toLowerCase()
    const cleanPass = password.trim()

    if (!cleanUser || !cleanPass) {
      return { success: false, error: 'Please enter both username and password.' }
    }

    try {
      const raw = localStorage.getItem(REGISTERED_USERS_KEY)
      const list: UserProfile[] = raw ? JSON.parse(raw) : DEFAULT_USERS
      const matched = list.find(u => u.username.toLowerCase() === cleanUser)

      if (!matched) {
        return { success: false, error: 'User not found. Please check your username or sign up.' }
      }

      if (matched.password !== cleanPass) {
        return { success: false, error: 'Incorrect password for this user.' }
      }

      const sessionUser: UserProfile = {
        id: matched.id,
        username: matched.username,
        firstName: matched.firstName,
        lastName: matched.lastName,
        country: matched.country,
        province: matched.province,
        role: 'user',
        createdAt: matched.createdAt,
        privacyPolicy: matched.privacyPolicy || {
          ...DEFAULT_STANDARD_POLICY,
          acceptedAt: matched.createdAt || new Date().toISOString(),
        },
        syncedWith: matched.syncedWith,
      }
      saveSession(sessionUser)
      return { success: true }
    } catch {
      return { success: false, error: 'Failed to access registered users data.' }
    }
  }

  const registerUser = (data: {
    username: string
    password: string
    firstName: string
    lastName: string
    country?: string
    province?: string
    acceptPrivacyPolicy?: boolean
  }) => {
    const username = data.username.trim().toLowerCase()
    const password = data.password.trim()
    const firstName = data.firstName.trim()
    const lastName = data.lastName.trim()

    if (!username || !password || !firstName || !lastName) {
      return { success: false, error: 'Username, password, first name, and last name are required.' }
    }

    if (username === 'admin' || username === 'pookie') {
      return { success: false, error: 'That username is reserved for system roles.' }
    }

    if (data.acceptPrivacyPolicy === false) {
      return { success: false, error: 'You must accept the Standard Level Privacy Policy to register.' }
    }

    try {
      const raw = localStorage.getItem(REGISTERED_USERS_KEY)
      const list: UserProfile[] = raw ? JSON.parse(raw) : DEFAULT_USERS

      // Strict duplicate username prevention (case-insensitive check against all registered users)
      const duplicate = list.find(u => u.username.toLowerCase() === username)
      if (duplicate) {
        return { success: false, error: `The username "${username}" is already taken. Please choose another username.` }
      }

      const userPrivacyPolicy: PrivacyPolicyRecord = {
        tier: 'standard',
        version: '1.0',
        title: 'Standard Level Privacy Policy',
        acceptedAt: new Date().toISOString(),
        personalShiftsPrivate: true,
        scheduleSyncConsent: true,
        locationWeatherConsent: true,
      }

      const newUser: UserProfile = {
        id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        username,
        password,
        firstName,
        lastName,
        country: data.country?.trim() || undefined,
        province: data.province?.trim() || undefined,
        role: 'user',
        createdAt: new Date().toISOString(),
        privacyPolicy: userPrivacyPolicy,
      }

      list.push(newUser)
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(list))

      // Auto login the newly registered user
      const sessionUser: UserProfile = {
        id: newUser.id,
        username: newUser.username,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        country: newUser.country,
        province: newUser.province,
        role: 'user',
        createdAt: newUser.createdAt,
        privacyPolicy: newUser.privacyPolicy,
      }
      saveSession(sessionUser)
      return { success: true }
    } catch {
      return { success: false, error: 'Failed to register user. Please try again.' }
    }
  }

  const [syncRequests, setSyncRequests] = useState<SyncRequest[]>(() => {
    try {
      const saved = localStorage.getItem(SYNC_STORAGE_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Synchronize sync requests across window storage events
  const refreshSyncRequests = () => {
    try {
      const saved = localStorage.getItem(SYNC_STORAGE_KEY)
      if (saved) setSyncRequests(JSON.parse(saved))
    } catch (e) {
      console.warn('Failed to refresh sync requests', e)
    }
  }

  useEffect(() => {
    const onStorage = () => refreshSyncRequests()
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const incomingSyncRequests = currentUser
    ? syncRequests.filter(
        r => r.recipientUsername.toLowerCase() === currentUser.username.toLowerCase() && r.status === 'pending'
      )
    : []

  const outgoingSyncRequests = currentUser
    ? syncRequests.filter(
        r => r.senderUsername.toLowerCase() === currentUser.username.toLowerCase()
      )
    : []

  const sendSyncInvite = (targetUsername: string) => {
    if (!currentUser) return { success: false, error: 'Must be signed in to send sync requests.' }
    const cleanTarget = targetUsername.trim().toLowerCase()
    if (!cleanTarget) return { success: false, error: 'Please enter a target username.' }

    if (cleanTarget === currentUser.username.toLowerCase()) {
      return { success: false, error: 'You cannot send a sync invite to yourself.' }
    }

    if (currentUser.syncedWith?.toLowerCase() === cleanTarget) {
      return { success: false, error: `You are already synced with @${cleanTarget}.` }
    }

    // Check if target user exists in registered storage
    const rawUsers = localStorage.getItem(REGISTERED_USERS_KEY)
    const registered: UserProfile[] = rawUsers ? JSON.parse(rawUsers) : DEFAULT_USERS
    const targetUser = registered.find(u => u.username.toLowerCase() === cleanTarget)
    if (!targetUser) {
      return { success: false, error: `User @${targetUsername.trim()} does not exist. Please check the spelling.` }
    }

    // Prevent duplicate pending invites in either direction
    const existingPending = syncRequests.find(
      r =>
        r.status === 'pending' &&
        ((r.senderUsername.toLowerCase() === currentUser.username.toLowerCase() &&
          r.recipientUsername.toLowerCase() === cleanTarget) ||
          (r.senderUsername.toLowerCase() === cleanTarget &&
            r.recipientUsername.toLowerCase() === currentUser.username.toLowerCase()))
    )
    if (existingPending) {
      return { success: false, error: `A sync invitation with @${cleanTarget} is already pending.` }
    }

    const requestId = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const newReq: SyncRequest = {
      id: requestId,
      senderUsername: currentUser.username,
      recipientUsername: cleanTarget,
      status: 'pending',
      createdAt: new Date().toISOString(),
      privacyTier: 'standard',
    }

    const updated = [...syncRequests, newReq]
    setSyncRequests(updated)
    try {
      localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to persist sync request', e)
    }

    return { success: true, requestId }
  }

  const acceptSyncInvite = (requestId: string) => {
    if (!currentUser) return { success: false, error: 'Must be logged in to accept invites.' }
    const req = syncRequests.find(r => r.id === requestId)
    if (!req) return { success: false, error: 'Invite not found.' }

    const sender = req.senderUsername
    const recipient = req.recipientUsername

    const updatedRequests: SyncRequest[] = syncRequests.map(r =>
      r.id === requestId ? { ...r, status: 'accepted' as const } : r
    )
    setSyncRequests(updatedRequests)
    try {
      localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(updatedRequests))
    } catch (e) {
      console.warn('Failed to update sync requests', e)
    }

    const updatedUser: UserProfile = { ...currentUser, syncedWith: sender }
    saveSession(updatedUser)

    try {
      const raw = localStorage.getItem(REGISTERED_USERS_KEY)
      if (raw) {
        const list: UserProfile[] = JSON.parse(raw)
        const updatedList = list.map(u => {
          if (u.username.toLowerCase() === recipient.toLowerCase()) {
            return { ...u, syncedWith: sender }
          }
          if (u.username.toLowerCase() === sender.toLowerCase()) {
            return { ...u, syncedWith: recipient }
          }
          return u
        })
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updatedList))
      }
    } catch (e) {
      console.warn('Failed to update registered users sync status', e)
    }

    window.dispatchEvent(new Event('storage'))
    return { success: true, partnerUsername: sender }
  }

  const declineSyncInvite = (requestId: string) => {
    if (!currentUser) return { success: false, error: 'Must be logged in to decline invites.' }
    const updatedRequests: SyncRequest[] = syncRequests.map(r =>
      r.id === requestId ? { ...r, status: 'declined' as const } : r
    )
    setSyncRequests(updatedRequests)
    try {
      localStorage.setItem(SYNC_STORAGE_KEY, JSON.stringify(updatedRequests))
    } catch (e) {
      console.warn('Failed to update sync requests', e)
    }
    return { success: true }
  }

  const disconnectSync = () => {
    if (!currentUser || !currentUser.syncedWith) return { success: false }
    const partner = currentUser.syncedWith

    const updatedUser: UserProfile = { ...currentUser, syncedWith: undefined }
    saveSession(updatedUser)

    try {
      const raw = localStorage.getItem(REGISTERED_USERS_KEY)
      if (raw) {
        const list: UserProfile[] = JSON.parse(raw)
        const updatedList = list.map(u => {
          if (
            u.username.toLowerCase() === currentUser.username.toLowerCase() ||
            u.username.toLowerCase() === partner.toLowerCase()
          ) {
            const copy = { ...u }
            delete copy.syncedWith
            return copy
          }
          return u
        })
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(updatedList))
      }
    } catch (e) {
      console.warn('Failed to clear sync in registered users', e)
    }

    window.dispatchEvent(new Event('storage'))
    return { success: true }
  }

  const logout = () => {
    setCurrentUser(null)
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    } catch (e) {
      console.warn('Failed to clear auth session', e)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        syncRequests,
        incomingSyncRequests,
        outgoingSyncRequests,
        sendSyncInvite,
        acceptSyncInvite,
        declineSyncInvite,
        disconnectSync,
        loginAsAdmin,
        loginAsPookie,
        loginAsUser,
        registerUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
