package handlers

import (
        "time"

        "github.com/bukdanaws-commits/seleevent/backend/internal/services"
        "github.com/gofiber/fiber/v2"
        "gorm.io/gorm"
)

// SSEStream handles GET /api/v1/events/stream
// SSE endpoint for real-time updates. Accepts the SSEHub via dependency injection
// instead of relying on the package-level global variable.
func SSEStream(db *gorm.DB, hub *services.SSEHub) fiber.Handler {
        return func(c *fiber.Ctx) error {
                // Set SSE headers
                c.Set("Content-Type", "text/event-stream")
                c.Set("Cache-Control", "no-cache")
                c.Set("Connection", "keep-alive")
                c.Set("X-Accel-Buffering", "no")

                // Guard against nil hub
                if hub == nil {
                        return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
                                "success": false,
                                "error":   "SSE service unavailable",
                        })
                }

                // Get client ID from JWT token if available
                _, _ = c.Locals("userID").(string)

                // Register client with the SSE hub (injected dependency)
                id, ch := hub.Register()

                // Ensure cleanup on disconnect
                defer hub.Unregister(id)

                // Set up a context cancellation notification
                done := c.Context().Done()

                // Send initial connection event
                initialData := services.MarshalEvent(services.SSEEvent{
                        Event: "connected",
                        Data: map[string]interface{}{
                                "clientId":   id,
                                "timestamp":  time.Now().Format("2006-01-02T15:04:05Z07:00"),
                                "serverTime": time.Now().Unix(),
                        },
                        ID: id,
                })
                c.Write(initialData)

                // Keep connection open and stream events
                ticker := time.NewTicker(30 * time.Second)
                defer ticker.Stop()

                for {
                        select {
                        case <-done:
                                return nil
                        case evt := <-ch:
                                data := services.MarshalEvent(evt)
                                if _, err := c.Write(data); err != nil {
                                        return nil
                                }
                        case <-ticker.C:
                                // Send keepalive comment to prevent connection timeout
                                if _, err := c.Write([]byte(": keepalive\n\n")); err != nil {
                                        return nil
                                }
                        }
                }
        }
}
