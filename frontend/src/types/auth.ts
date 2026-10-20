export type UserRole = 'admin' | 'user' | 'pookie'

export interface UserProfile {
  id: string
  username: string
  firstName: string
  lastName: string
  role: UserRole
  country?: string
  province?: string
  createdAt?: string
  password?: string // only stored locally in demo storage
}

export interface AuthContextType {
  currentUser: UserProfile | null
  loginAsAdmin: (password: string) => { success: boolean; error?: string }
  loginAsPookie: (password: string) => { success: boolean; error?: string }
  loginAsUser: (username: string, password: string) => { success: boolean; error?: string }
  registerUser: (data: {
    username: string
    password: string
    firstName: string
    lastName: string
    country?: string
    province?: string
  }) => { success: boolean; error?: string }
  logout: () => void
}
