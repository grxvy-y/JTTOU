import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { UserProfile, AuthContextType } from '../types/auth'

const AUTH_STORAGE_KEY = 'jttou_auth_user'
const REGISTERED_USERS_KEY = 'jttou_registered_users'

const ADMIN_PASSWORD = '2705'
const POOKIE_PASSWORD = '101005'

// Seed a default demo registered user if none exists
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

  // Ensure default registered users exist in storage
  useEffect(() => {
    try {
      const existing = localStorage.getItem(REGISTERED_USERS_KEY)
      if (!existing) {
        localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(DEFAULT_USERS))
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

    try {
      const raw = localStorage.getItem(REGISTERED_USERS_KEY)
      const list: UserProfile[] = raw ? JSON.parse(raw) : DEFAULT_USERS

      if (list.some(u => u.username.toLowerCase() === username)) {
        return { success: false, error: 'This username is already taken. Please choose another.' }
      }

      const newUser: UserProfile = {
        id: `user-${Date.now()}`,
        username,
        password,
        firstName,
        lastName,
        country: data.country?.trim() || undefined,
        province: data.province?.trim() || undefined,
        role: 'user',
        createdAt: new Date().toISOString(),
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
      }
      saveSession(sessionUser)
      return { success: true }
    } catch {
      return { success: false, error: 'Failed to register user. Please try again.' }
    }
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
