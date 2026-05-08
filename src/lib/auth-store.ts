import { create } from 'zustand'
import type { UserRole, UserStatus, IUser } from '@/lib/types'
import { setTokens, clearTokens, getAccessToken, apiFetch } from '@/lib/api'
import { getSSEClient, disconnectSSE } from '@/lib/sse'

// ─── GOOGLE OAUTH CONFIG ──────────────────────────────────────────────────

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

// ─── TYPES ─────────────────────────────────────────────────────────────────

interface AuthUser extends IUser {
  role: UserRole
  status: UserStatus
}

interface AuthState {
  // State
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  accessToken: string | null
  refreshToken: string | null
  selectedEventId: string | null

  // Actions
  login: () => Promise<void>
  loginAsRole: (role: UserRole) => Promise<void>
  logout: () => void
  rehydrateSession: () => Promise<void>
  storeTokens: (access: string, refresh: string) => void
  hasRole: (...roles: UserRole[]) => boolean
  setSelectedEvent: (eventId: string | null) => void
}

// ─── ROLE-BASED MOCK USERS (DEV ONLY — for loginAsRole quick testing) ─────

const MOCK_USERS_BY_ROLE: Record<UserRole, AuthUser> = {
  SUPER_ADMIN: {
    id: 'user-superadmin',
    googleId: '',
    name: 'Bukdan Admin',
    email: 'bukdan@seleevent.id',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Bukdan',
    phone: '081200001111',
    role: 'SUPER_ADMIN',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  ORGANIZER: {
    id: 'user-organizer',
    googleId: '',
    name: 'Andi Wijaya',
    email: 'andi.wijaya@gmail.com',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Andi',
    phone: '081200003333',
    organizerId: 'org-sheila-on7',
    tenantId: 'tenant-sheila-on7',
    role: 'ORGANIZER',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  COUNTER_STAFF: {
    id: 'user-counter',
    googleId: '',
    name: 'Rina Wulandari',
    email: 'rina.w@gmail.com',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Rina',
    phone: '081200006666',
    role: 'COUNTER_STAFF',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  GATE_STAFF: {
    id: 'user-gate',
    googleId: '',
    name: 'Bayu Aditya',
    email: 'bayu.a@gmail.com',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Bayu',
    phone: '081200020001',
    role: 'GATE_STAFF',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  PARTICIPANT: {
    id: 'user-participant',
    googleId: '',
    name: 'Budi Santoso',
    email: 'budi.santoso@gmail.com',
    avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Budi',
    phone: '081234567890',
    role: 'PARTICIPANT',
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
}

// ─── DASHBOARD ROUTES BY ROLE ──────────────────────────────────────────────

export const DASHBOARD_ROUTES: Record<UserRole, string> = {
  SUPER_ADMIN: '/admin',
  ORGANIZER: '/admin',
  COUNTER_STAFF: '/counter',
  GATE_STAFF: '/gate',
  PARTICIPANT: '/',
}

// ─── ROLE LABELS ──────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ORGANIZER: 'Organizer',
  COUNTER_STAFF: 'Counter Staff',
  GATE_STAFF: 'Gate Staff',
  PARTICIPANT: 'Peserta',
}

// ─── ROLE BADGE COLORS ────────────────────────────────────────────────────

export const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
  ORGANIZER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  COUNTER_STAFF: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  GATE_STAFF: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PARTICIPANT: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

// ─── GOOGLE OAUTH HELPER ─────────────────────────────────────────────────

// Load Google Identity Services script dynamically
function loadGIS(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && ((window as unknown as Record<string, unknown>).google as Record<string, unknown>)?.accounts) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.head.appendChild(script)
  })
}

// Get Google ID token using popup (more reliable than One Tap)
async function getGoogleIdToken(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Client ID not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable.')
  }

  await loadGIS()

  const google = (window as unknown as { google: { accounts: { id: { initialize: (config: Record<string, unknown>) => void; prompt: (callback: (notification: Record<string, unknown>) => void) => void; renderButton: (parent: HTMLElement, config: Record<string, unknown>) => void } } } }).google

  return new Promise((resolve, reject) => {
    google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (response: { credential?: string }) => {
        if (response.credential) {
          resolve(response.credential)
        } else {
          reject(new Error('No credential received'))
        }
      },
      auto_select: false,
      cancel_on_tap_outside: true,
    })

    google.accounts.id.prompt((notification: Record<string, unknown>) => {
      if (notification.isNotDisplayed || notification.isSkippedMoment) {
        console.warn('[Auth] Google One Tap not available, trying popup flow...')
        tryOAuth2Popup(GOOGLE_CLIENT_ID, resolve, reject)
      }
    })
  })
}

// Fallback: OAuth2 popup-based sign-in when One Tap fails
function tryOAuth2Popup(
  clientId: string,
  resolve: (token: string) => void,
  reject: (error: Error) => void
) {
  const redirectUri = \`\${window.location.origin}/\`
  const scope = 'openid email profile'
  const authUrl = \`https://accounts.google.com/o/oauth2/v2/auth?\` +
    \`client_id=\${encodeURIComponent(clientId)}\` +
    \`&redirect_uri=\${encodeURIComponent(redirectUri)}\` +
    \`&response_type=id_token\` +
    \`&scope=\${encodeURIComponent(scope)}\` +
    \`&prompt=select_account\` +
    \`&nonce=\${Date.now()}\`

  const popup = window.open(authUrl, 'google-signin', 'width=500,height=600,left=100,top=100')

  if (!popup) {
    reject(new Error('Popup blocked. Please allow popups for this site.'))
    return
  }

  const checkPopup = setInterval(() => {
    try {
      if (popup.closed) {
        clearInterval(checkPopup)
        reject(new Error('Sign-in popup was closed'))
        return
      }
      const popupUrl = popup.location.href
      if (popupUrl) {
        const hashParams = new URLSearchParams(popupUrl.split('#')[1] || '')
        const idToken = hashParams.get('id_token')
        if (idToken) {
          popup.close()
          clearInterval(checkPopup)
          resolve(idToken)
        }
      }
    } catch {
      // Cross-origin error - popup hasn't redirected yet
    }
  }, 500)

  setTimeout(() => {
    clearInterval(checkPopup)
    if (!popup.closed) popup.close()
    reject(new Error('Sign-in timed out'))
  }, 60000)
}

// ─── STORE ─────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  accessToken: typeof window !== 'undefined' ? getAccessToken() : null,
  refreshToken: null,
  selectedEventId: null,

  login: async () => {
    set({ isLoading: true })
    try {
      // Step 1: Get Google ID token (real OAuth)
      const googleIdToken = await getGoogleIdToken()

      // Step 2: Send to our backend for verification + JWT generation
      // apiFetch already unwraps the envelope, so we get the data directly
      const response = await apiFetch<{
        user: AuthUser
        accessToken: string
        refreshToken: string
        expiresIn: number
      }>('/api/v1/auth/google', {
        method: 'POST',
        body: JSON.stringify({ token: googleIdToken }),
      })

      // Step 3: Store tokens
      setTokens(response.accessToken, response.refreshToken)

      // Step 4: Connect SSE for real-time updates
      const sse = getSSEClient()
      sse.connect(response.accessToken)

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      })
    } catch (error) {
      console.error('Google login failed:', error)
      // NO mock fallback — show error to user
      set({ isLoading: false })
      throw error
    }
  },

  loginAsRole: async (role: UserRole) => {
    // DEV ONLY: Quick role-based login for testing purposes
    set({ isLoading: true })
    await new Promise((resolve) => setTimeout(resolve, 500))

    const mockTokens = {
      access: `mock_token_${role.toLowerCase()}_${Date.now()}`,
      refresh: `mock_refresh_${role.toLowerCase()}_${Date.now()}`,
    }

    setTokens(mockTokens.access, mockTokens.refresh)

    // Connect SSE even for mock tokens (will fail gracefully)
    const sse = getSSEClient()
    sse.connect(mockTokens.access)

    set({
      user: MOCK_USERS_BY_ROLE[role],
      isAuthenticated: true,
      isLoading: false,
      accessToken: mockTokens.access,
      refreshToken: mockTokens.refresh,
    })
  },

  logout: () => {
    // Disconnect SSE first
    disconnectSSE()
    clearTokens()
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      refreshToken: null,
    })
  },

  rehydrateSession: async () => {
    // ─── MOCK MODE: Auto-login based on URL path (ON by default) ────────
    if (typeof window !== 'undefined') {
      const mockEnvDisabled = process.env.NEXT_PUBLIC_USE_MOCK === 'false'
      const mockLocalStorageDisabled = localStorage.getItem('sele_use_mock') === 'false'
      const useMock = !mockEnvDisabled && !mockLocalStorageDisabled
      if (useMock) {
        const pathname = window.location.pathname

        // Determine role from URL path + localStorage
        let role: UserRole = 'PARTICIPANT'
        if (pathname.startsWith('/admin')) {
          // Both SUPER_ADMIN and ORGANIZER use /admin
          // Check localStorage for previously selected role, default to SUPER_ADMIN
          const savedRole = localStorage.getItem('sele_mock_role')
          role = (savedRole === 'ORGANIZER') ? 'ORGANIZER' : 'SUPER_ADMIN'
        }
        else if (pathname.startsWith('/counter')) role = 'COUNTER_STAFF'
        else if (pathname.startsWith('/gate')) role = 'GATE_STAFF'

        // Store role for mock handlers
        localStorage.setItem('sele_mock_role', role)

        // Auto-login as this role
        await get().loginAsRole(role)
        return
      }
    }

    // ─── REAL MODE: Rehydrate from token ──────────────────────────────────
    const token = getAccessToken()
    if (!token) return

    set({ isLoading: true })
    try {
      // Call /auth/me to rehydrate the session from existing token
      const response = await apiFetch<{ user: AuthUser }>('/api/v1/auth/me')

      // Connect SSE
      const sse = getSSEClient()
      sse.connect(token)

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        accessToken: token,
      })
    } catch {
      // Token is invalid/expired — clear it
      clearTokens()
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        accessToken: null,
        refreshToken: null,
      })
    }
  },

  storeTokens: (access: string, refresh: string) => {
    setTokens(access, refresh)
    set({ accessToken: access, refreshToken: refresh })
  },

  hasRole: (...roles) => {
    const user = get().user
    if (!user) return false
    return roles.includes(user.role)
  },

  setSelectedEvent: (eventId) => {
    set({ selectedEventId: eventId })
  },
}))
