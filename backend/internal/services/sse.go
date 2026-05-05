package services

import (
	"sync"
	"time"

	"encoding/json"

	"github.com/google/uuid"
)

// SSEEvent represents a server-sent event.
type SSEEvent struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
	ID    string      `json:"id"`
}

// SSEClient represents a connected SSE client.
type SSEClient struct {
	ID   string
	Chan chan SSEEvent
}

// SSEHub manages SSE connections and broadcasting.
type SSEHub struct {
	mu      sync.RWMutex
	clients map[string]*SSEClient
}

// Hub is the global SSE hub instance.
var Hub *SSEHub

// NewSSEHub creates and returns a new SSEHub instance.
func NewSSEHub() *SSEHub {
	return &SSEHub{
		clients: make(map[string]*SSEClient),
	}
}

// Register adds a new SSE client and returns the client ID.
func (h *SSEHub) Register() (string, <-chan SSEEvent) {
	id := uuid.New().String()
	ch := make(chan SSEEvent, 64)
	h.mu.Lock()
	h.clients[id] = &SSEClient{ID: id, Chan: ch}
	h.mu.Unlock()
	return id, ch
}

// Unregister removes an SSE client.
func (h *SSEHub) Unregister(id string) {
	h.mu.Lock()
	if client, ok := h.clients[id]; ok {
		close(client.Chan)
		delete(h.clients, id)
	}
	h.mu.Unlock()
}

// Broadcast sends an event to all connected clients.
func (h *SSEHub) Broadcast(eventType string, data interface{}) {
	evt := SSEEvent{
		Event: eventType,
		Data:  data,
		ID:    uuid.New().String(),
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, client := range h.clients {
		select {
		case client.Chan <- evt:
		default:
			// channel full, skip
		}
	}
}

// BroadcastWithTimestamp broadcasts an event with a server timestamp.
func (h *SSEHub) BroadcastWithTimestamp(eventType string, data interface{}) {
	evt := map[string]interface{}{
		"event":     eventType,
		"data":      data,
		"id":        uuid.New().String(),
		"timestamp": time.Now().UnixMilli(),
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	for _, client := range h.clients {
		select {
		case client.Chan <- SSEEvent{Event: eventType, Data: evt, ID: uuid.New().String()}:
		default:
		}
	}
}

// SendToClient sends an event to a specific client.
func (h *SSEHub) SendToClient(clientID, eventType string, data interface{}) {
	evt := SSEEvent{
		Event: eventType,
		Data:  data,
		ID:    uuid.New().String(),
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	if client, ok := h.clients[clientID]; ok {
		select {
		case client.Chan <- evt:
		default:
		}
	}
}

// ClientCount returns the number of connected clients.
func (h *SSEHub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// Run starts the SSEHub event loop (placeholder for future channel-based processing).
func (h *SSEHub) Run() {
	// The hub operates synchronously via mutex-protected methods.
	// This method exists for compatibility with the existing main.go setup.
	// If needed, it can be extended to handle async register/unregister channels.
}

// MarshalEvent formats an SSEEvent for the wire (text/event-stream).
func MarshalEvent(evt SSEEvent) []byte {
	data, _ := json.Marshal(evt.Data)
	return []byte("id:" + evt.ID + "\nevent:" + evt.Event + "\ndata:" + string(data) + "\n\n")
}
