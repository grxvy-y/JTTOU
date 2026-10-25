export type UserRole = 'admin' | 'user' | 'pookie'

export interface PrivacyPolicyRecord {
  tier: 'standard'
  version: string
  title: string
  acceptedAt: string
  personalShiftsPrivate: boolean
  scheduleSyncConsent: boolean
  locationWeatherConsent: boolean
}

export interface SyncRequest {
  id: string
  senderUsername: string
  recipientUsername: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
  privacyTier: 'standard'
}

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
  privacyPolicy?: PrivacyPolicyRecord
  syncedWith?: string
}

export interface AuthContextType {
  currentUser: UserProfile | null
  syncRequests: SyncRequest[]
  incomingSyncRequests: SyncRequest[]
  outgoingSyncRequests: SyncRequest[]
  sendSyncInvite: (targetUsername: string) => { success: boolean; error?: string; requestId?: string }
  acceptSyncInvite: (requestId: string) => { success: boolean; error?: string; partnerUsername?: string }
  declineSyncInvite: (requestId: string) => { success: boolean; error?: string }
  disconnectSync: () => { success: boolean }
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
    acceptPrivacyPolicy?: boolean
  }) => { success: boolean; error?: string }
  logout: () => void
}
