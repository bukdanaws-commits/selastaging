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
  isHydrated: boolean
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

// ─── ROLE-BASED MOCK USERS (DEV ONLY) ─────────────────────────────────────

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

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ORGANIZER: 'Organizer',
  COUNTER_STAFF: 'Counter Staff',
  GATE_STAFF: 'Gate Staff',
  PARTICIPANT: 'Peserta',
}

export const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
  ORGANIZER: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  COUNTER_STAFF: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  GATE_STAFF: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PARTICIPANT: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

// ─── GOOGLE OAUTH HELPER ─────────────────────────────────────────────────

// GIS type definitions
interface GisCredentialResponse {
  credential?: string
  error?: string
  select_by?: string
}

interface GisPromptNotification {
  isNotDisplayed: () => boolean
  isSkippedMoment: () => boolean
  getNotDisplayedReason: () => string
  getSkippedReason: () => string
}

interface GisId {
  initialize: (config: {
    client_id: string
    callback: (response: GisCredentialResponse) => void
    auto_select?: boolean
    cancel_on_tap_outside?: boolean
    use_fedcm_for_prompt?: boolean
  }) => void
  prompt: (callback?: (notification: GisPromptNotification) => void) => void
  disableAutoSelect: () => void
}

interface GisTokenClient {
  requestAccessToken: (config?: { prompt?: string }) => void
}

interface GisTokenResponse {
  access_token: string
  expires_in?: number
  token_type?: string
  scope?: string
}

interface GisOauth2 {
  initTokenClient: (config: {
    client_id: string
    scope: string
    callback: (response: GisTokenResponse) => void
    error_callback?: (error: { type: string; message?: string }) => void
  }) => GisTokenClient
}

interface GoogleAccounts {
  id: GisId
  oauth2: GisOauth2
}

// Google userinfo response
interface GoogleUserInfo {
  sub: string
  email: string
  email_verified: boolean
  name: string
  given_name?: string
  family_name?: string
  picture: string
  locale?: string
}

// Result from getGoogleToken — includes token type and optional userinfo
interface GoogleTokenResult {
  token: string
  tokenType: 'id_token' | 'access_token'
  userInfo?: GoogleUserInfo
}

// ─── Double-init guard ────────────────────────────────────────────────────
// Prevent google.accounts.id.initialize() from being called more than once,
// which can cause the callback to be overwritten and One Tap to malfunction.

const GIS_INITIALIZED_FLAG = '__sele_gis_initialized'
let gisInitPromise: Promise<void> | null = null

function isGisInitialized(): boolean {
  if (typeof window === 'undefined') return false
  return !!(window as Record<string, unknown>)[GIS_INITIALIZED_FLAG]
}

function markGisInitialized(): void {
  if (typeof window === 'undefined') return
  ;(window as Record<string, unknown>)[GIS_INITIALIZED_FLAG] = true
}

// Load Google Identity Services script dynamically
function loadGIS(): Promise<void> {
  if (gisInitPromise) return gisInitPromise

  gisInitPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Cannot load GIS on server side'))
      gisInitPromise = null
      return
    }

    const win = window as unknown as { google?: { accounts?: { id?: unknown } } }
    if (win.google?.accounts?.id) {
      resolve()
      return
    }

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve())
      existingScript.addEventListener('error', () => {
        reject(new Error('Failed to load Google Identity Services'))
        gisInitPromise = null
      })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      reject(new Error('Failed to load Google Identity Services'))
      gisInitPromise = null
    }
    document.head.appendChild(script)
  })

  return gisInitPromise
}

/**
 * Fetch Google userinfo using an access_token.
 * This is used when the popup OAuth2 flow returns an access_token instead of
 * an ID token. The userinfo provides email, name, picture etc. that the
 * backend may need to create/authenticate the user.
 */
async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo | undefined> {
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    })
    if (response.ok) {
      const userInfo: GoogleUserInfo = await response.json()
      console.log('[Auth] Fetched Google userinfo:', userInfo.email, '(sub:', userInfo.sub + ')')
      return userInfo
    }
    console.warn('[Auth] Failed to fetch Google userinfo:', response.status)
    return undefined
  } catch (err) {
    console.warn('[Auth] Error fetching Google userinfo:', err)
    return undefined
  }
}

/**
 * Get Google token using the most reliable method available.
 *
 * Strategy:
 * 1. Try One Tap (google.accounts.id.prompt) → returns ID token JWT directly
 * 2. If One Tap fails/skipped → use OAuth2 popup (initTokenClient) → returns access_token
 * 3. With access_token, fetch user info from Google and send to backend
 *
 * NEVER use redirect-based OAuth — it requires redirect_uri to be registered
 * and causes a full page navigation, losing app state.
 */
async function getGoogleToken(): Promise<GoogleTokenResult> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google Client ID not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable.')
  }

  await loadGIS()

  const win = window as unknown as { google: { accounts: GoogleAccounts } }
  const { google } = win

  return new Promise((resolve, reject) => {
    let resolved = false
    let popupTimeoutId: ReturnType<typeof setTimeout> | null = null

    const cleanup = () => {
      if (popupTimeoutId) {
        clearTimeout(popupTimeoutId)
        popupTimeoutId = null
      }
    }

    // ─── Initialize Google Identity Services ──────────────────────────
    // Only call initialize() ONCE — reuse the same callback for subsequent
    // login attempts by overriding resolve/reject.
    if (!isGisInitialized()) {
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: GisCredentialResponse) => {
          if (resolved) return
          if (response.credential) {
            resolved = true
            cleanup()
            const tokenType = response.credential.startsWith('eyJ') ? 'id_token' as const : 'access_token' as const
            console.log(`[Auth] ✅ One Tap success: ${tokenType} received (length: ${response.credential.length})`)
            resolve({ token: response.credential, tokenType })
          } else {
            console.warn('[Auth] One Tap callback fired but no credential — waiting for popup fallback')
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
      })
      markGisInitialized()
      console.log('[Auth] GIS initialized ✅')
    }

    // ─── Try One Tap first ────────────────────────────────────────────
    google.accounts.id.prompt((notification: GisPromptNotification) => {
      if (resolved) return // Already got the token from One Tap

      const notDisplayed = notification.isNotDisplayed()
      const skipped = notification.isSkippedMoment()

      if (notDisplayed || skipped) {
        const reason = notDisplayed
          ? notification.getNotDisplayedReason()
          : notification.getSkippedReason()

        console.log(`[Auth] One Tap not available (${reason}), opening popup fallback...`)

        // ─── Fallback: OAuth2 Popup (NOT redirect!) ──────────────
        // initTokenClient opens a popup and returns access_token.
        // This does NOT require redirect_uri to be registered in Google Console.
        try {
          const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'openid email profile',
            callback: async (tokenResponse: GisTokenResponse) => {
              if (resolved) return
              if (tokenResponse.access_token) {
                resolved = true
                cleanup()
                console.log(`[Auth] ✅ OAuth2 popup success: access_token received (length: ${tokenResponse.access_token.length})`)

                // Fetch user info from Google using the access_token
                // This gives the backend the user's email, name, picture etc.
                const userInfo = await fetchGoogleUserInfo(tokenResponse.access_token)

                resolve({
                  token: tokenResponse.access_token,
                  tokenType: 'access_token',
                  userInfo,
                })
              } else {
                cleanup()
                reject(new Error('No access token received from Google OAuth2 popup'))
              }
            },
            error_callback: (error: { type: string; message?: string }) => {
              console.error('[Auth] ❌ OAuth2 popup error:', error.type, error.message || '')
              cleanup()
              if (!resolved) {
                // Map common error types to user-friendly messages
                if (error.type === 'popup_closed') {
                  reject(new Error('Login dibatalkan. Popup ditutup sebelum login selesai.'))
                } else {
                  reject(new Error(`Google sign-in gagal: ${error.type}. Silakan coba lagi.`))
                }
              }
            },
          })

          // Open the popup — use 'select_account' so user picks their Google account
          // DO NOT use 'consent' as it forces the consent screen every time
          tokenClient.requestAccessToken({ prompt: 'select_account' })

          // Set a timeout in case the popup is closed/ignored
          // Google's error_callback should fire, but just in case
          popupTimeoutId = setTimeout(() => {
            if (!resolved) {
              resolved = true
              cleanup()
              reject(new Error('Login timeout — popup tidak merespon. Coba lagi.'))
            }
          }, 60000) // 60 seconds — generous timeout for slow connections

        } catch (err) {
          console.error('[Auth] ❌ Failed to init OAuth2 token client:', err)
          cleanup()
          if (!resolved) {
            reject(new Error('Gagal membuka popup Google. Pastikan popup tidak diblokir browser.'))
          }
        }
      }
      // If One Tap IS displayed, the callback above will fire with the credential
    })
  })
}

// ─── STORE ─────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isHydrated: false,
  accessToken: null,
  refreshToken: null,
  selectedEventId: null,

  login: async () => {
    set({ isLoading: true })
    try {
      // Step 1: Get Google token (ID token from One Tap, or access_token from popup)
      const googleResult = await getGoogleToken()

      const tokenDesc = googleResult.tokenType === 'id_token'
        ? 'ID_TOKEN (eyJ...)'
        : 'ACCESS_TOKEN (ya29...)'

      console.log(`[Auth] Sending ${tokenDesc} to backend...`)

      // Step 2: Send to backend for verification
      // Include tokenType and optional userInfo so the backend can handle both cases:
      //   - ID token: Backend verifies JWT with Google's public keys
      //   - Access token: Backend verifies with Google's tokeninfo endpoint, uses userInfo
      const response = await apiFetch<{
        user: AuthUser
        accessToken: string
        refreshToken: string
        expiresIn: number
      }>('/api/v1/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          token: googleResult.token,
          tokenType: googleResult.tokenType,
          // Include userInfo if available (from popup access_token flow)
          // Backend can use this as fallback if it can't verify the access_token
          ...(googleResult.userInfo ? {
            googleUser: {
              sub: googleResult.userInfo.sub,
              email: googleResult.userInfo.email,
              emailVerified: googleResult.userInfo.email_verified,
              name: googleResult.userInfo.name,
              givenName: googleResult.userInfo.given_name,
              familyName: googleResult.userInfo.family_name,
              picture: googleResult.userInfo.picture,
            },
          } : {}),
        }),
      })

      // Step 3: Store tokens
      setTokens(response.accessToken, response.refreshToken)

      // Step 4: Connect SSE
      const sse = getSSEClient()
      sse.connect(response.accessToken)

      console.log('[Auth] ✅ Login successful! User:', response.user?.email || response.user?.name)

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        isHydrated: true,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      })
    } catch (error) {
      console.error('[Auth] ❌ Login failed:', error)
      set({ isLoading: false, isHydrated: true })
      throw error
    }
  },

  loginAsRole: async (role: UserRole) => {
    set({ isLoading: true })
    await new Promise((resolve) => setTimeout(resolve, 300))

    const mockTokens = {
      access: `mock_token_${role.toLowerCase()}_${Date.now()}`,
      refresh: `mock_refresh_${role.toLowerCase()}_${Date.now()}`,
    }

    setTokens(mockTokens.access, mockTokens.refresh)

    const sse = getSSEClient()
    sse.connect(mockTokens.access)

    set({
      user: MOCK_USERS_BY_ROLE[role],
      isAuthenticated: true,
      isLoading: false,
      isHydrated: true,
      accessToken: mockTokens.access,
      refreshToken: mockTokens.refresh,
    })
  },

  logout: () => {
    disconnectSSE()
    clearTokens()
    // Reset GIS initialization flag so re-login works cleanly
    if (typeof window !== 'undefined') {
      delete (window as Record<string, unknown>)[GIS_INITIALIZED_FLAG]
    }
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      isHydrated: true,
      accessToken: null,
      refreshToken: null,
    })
  },

  rehydrateSession: async () => {
    // ─── MOCK MODE ────────────────────────────────────────────────────
    if (typeof window !== 'undefined') {
      const mockEnvDisabled = process.env.NEXT_PUBLIC_USE_MOCK === 'false'
      const mockLocalStorageDisabled = localStorage.getItem('sele_use_mock') === 'false'
      const useMock = !mockEnvDisabled && !mockLocalStorageDisabled
      if (useMock) {
        const pathname = window.location.pathname

        let role: UserRole = 'PARTICIPANT'
        if (pathname.startsWith('/admin')) {
          const savedRole = localStorage.getItem('sele_mock_role')
          role = (savedRole === 'ORGANIZER') ? 'ORGANIZER' : 'SUPER_ADMIN'
        }
        else if (pathname.startsWith('/counter')) role = 'COUNTER_STAFF'
        else if (pathname.startsWith('/gate')) role = 'GATE_STAFF'

        localStorage.setItem('sele_mock_role', role)
        await get().loginAsRole(role)
        return
      }
    }

    // ─── REAL MODE ────────────────────────────────────────────────────
    const token = getAccessToken()
    if (!token) {
      set({ isHydrated: true })
      return
    }

    set({ isLoading: true })
    try {
      const response = await apiFetch<{ user: AuthUser }>('/api/v1/auth/me')

      const sse = getSSEClient()
      sse.connect(token)

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        isHydrated: true,
        accessToken: token,
      })
    } catch {
      clearTokens()
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isHydrated: true,
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
