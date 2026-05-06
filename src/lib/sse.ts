// ─── SELEEVENT SSE CLIENT ──────────────────────────────────────────────────
// Server-Sent Events client for real-time updates from Golang Fiber backend
// Backend endpoint: GET /api/v1/events/stream?token=xxx
// Event types: "redemption", "gate_scan", "ticket_cancelled", "stats_update"

type SSEEventHandler = (event: MessageEvent) => void
type SSEStatusHandler = (status: 'connecting' | 'connected' | 'disconnected' | 'error') => void

interface SSEClientOptions {
  onMessage?: SSEEventHandler
  onStatusChange?: SSEStatusHandler
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

class SSEClient {
  private eventSource: EventSource | null = null
  private token: string | null = null
  private url: string
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number
  private reconnectInterval: number
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private eventHandlers: Map<string, SSEEventHandler[]> = new Map()
  private statusHandlers: SSEStatusHandler[] = []
  private _status: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected'

  constructor(options: SSEClientOptions = {}) {
    const GO_BACKEND_PORT = process.env.NEXT_PUBLIC_GO_PORT || '8080'
    this.url = `/?XTransformPort=${GO_BACKEND_PORT}/api/v1/events/stream`
    this.reconnectInterval = options.reconnectInterval || 3000
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10

    if (options.onMessage) {
      this.on('*', options.onMessage)
    }
    if (options.onStatusChange) {
      this.onStatusChange(options.onStatusChange)
    }
  }

  get status() {
    return this._status
  }

  // ─── CONNECTION ──────────────────────────────────────────────────────────

  connect(token?: string): void {
    this.token = token || this.token
    if (!this.token) return
    if (this.eventSource) {
      // Already connected or connecting — disconnect first
      this._closeEventSource()
    }

    this._updateStatus('connecting')

    // Build URL with token query param (EventSource can't send headers)
    const separator = this.url.includes('?') ? '&' : '?'
    const fullUrl = `${this.url}${separator}token=${encodeURIComponent(this.token)}`

    try {
      this.eventSource = new EventSource(fullUrl)

      this.eventSource.onopen = () => {
        this._updateStatus('connected')
        this.reconnectAttempts = 0
      }

      this.eventSource.onmessage = (event) => {
        try {
          this._handleEvent(event)
        } catch {
          // Ignore malformed events
        }
      }

      this.eventSource.onerror = () => {
        this._updateStatus('error')
        this._closeEventSource()
        this._scheduleReconnect()
      }

      // Register named event listeners for specific event types
      const eventTypes = ['redemption', 'gate_scan', 'ticket_cancelled', 'stats_update', 'connected']
      eventTypes.forEach((type) => {
        if (this.eventSource) {
          this.eventSource.addEventListener(type, (event: MessageEvent) => {
            this._handleTypedEvent(type, event)
          })
        }
      })
    } catch {
      this._updateStatus('error')
      this._scheduleReconnect()
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.reconnectAttempts = 0
    this._closeEventSource()
    this._updateStatus('disconnected')
  }

  // ─── EVENT HANDLERS ──────────────────────────────────────────────────────

  on(eventType: string, handler: SSEEventHandler): () => void {
    const handlers = this.eventHandlers.get(eventType) || []
    handlers.push(handler)
    this.eventHandlers.set(eventType, handlers)

    // Return unsubscribe function
    return () => {
      const current = this.eventHandlers.get(eventType) || []
      this.eventHandlers.set(eventType, current.filter(h => h !== handler))
    }
  }

  onStatusChange(handler: SSEStatusHandler): () => void {
    this.statusHandlers.push(handler)
    return () => {
      this.statusHandlers = this.statusHandlers.filter(h => h !== handler)
    }
  }

  // ─── PRIVATE ─────────────────────────────────────────────────────────────

  private _closeEventSource(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
  }

  private _handleEvent(event: MessageEvent): void {
    // Call wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*') || []
    wildcardHandlers.forEach(h => h(event))
  }

  private _handleTypedEvent(type: string, event: MessageEvent): void {
    // Call type-specific handlers
    const typeHandlers = this.eventHandlers.get(type) || []
    typeHandlers.forEach(h => h(event))

    // Also call wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*') || []
    wildcardHandlers.forEach(h => h(event))
  }

  private _updateStatus(status: typeof this._status): void {
    this._status = status
    this.statusHandlers.forEach(h => h(status))
  }

  private _scheduleReconnect(): void {
    if (this.reconnectTimer) return
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return

    this.reconnectAttempts++
    const delay = Math.min(
      this.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
      30000
    )

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }
}

// ─── SINGLETON EXPORT ──────────────────────────────────────────────────────

let sseClient: SSEClient | null = null

export function getSSEClient(options?: SSEClientOptions): SSEClient {
  if (!sseClient) {
    sseClient = new SSEClient(options)
  }
  return sseClient
}

export function disconnectSSE(): void {
  if (sseClient) {
    sseClient.disconnect()
    sseClient = null
  }
}

export { SSEClient }
export default getSSEClient
