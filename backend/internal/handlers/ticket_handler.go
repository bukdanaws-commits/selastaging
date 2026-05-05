package handlers

import (
        "github.com/bukdanaws-commits/seleevent/backend/internal/models"
        "github.com/bukdanaws-commits/seleevent/backend/internal/services"
        "github.com/bukdanaws-commits/seleevent/backend/pkg/response"
        "github.com/gofiber/fiber/v2"
        "gorm.io/gorm"
)

// checkTicketRequest represents the request body for checking a ticket.
type checkTicketRequest struct {
        TicketCode string `json:"ticketCode"`
}

// CheckTicket handles POST /api/v1/tickets/check
// Public endpoint - no auth required for QR scan check.
func CheckTicket(db *gorm.DB) fiber.Handler {
        ticketService := services.NewTicketService(db)
        return func(c *fiber.Ctx) error {
                var req checkTicketRequest
                if err := c.BodyParser(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }
                if req.TicketCode == "" {
                        return response.BadRequest(c, "ticketCode is required")
                }

                result, err := ticketService.CheckTicket(req.TicketCode)
                if err != nil {
                        return response.InternalError(c, "Failed to check ticket")
                }

                return response.OK(c, result)
        }
}

// GetEventBySlug handles GET /api/v1/events/:slug
func GetEventBySlug(db *gorm.DB) fiber.Handler {
        return func(c *fiber.Ctx) error {
                slug := c.Params("slug")
                if slug == "" {
                        return response.BadRequest(c, "Event slug is required")
                }

                var event models.Event
                if err := db.Preload("TicketTypes").Where("slug = ?", slug).First(&event).Error; err != nil {
                        return response.NotFound(c, "Event not found")
                }

                return response.OK(c, event)
        }
}

// GetTicketTypes handles GET /api/v1/events/:eventId/ticket-types
// GetEventTicketTypes is an alias that routes.go uses.
func GetEventTicketTypes(db *gorm.DB) fiber.Handler {
        return GetTicketTypes(db)
}

func GetTicketTypes(db *gorm.DB) fiber.Handler {
        ticketService := services.NewTicketService(db)
        return func(c *fiber.Ctx) error {
                eventID := c.Params("eventId")
                if eventID == "" {
                        return response.BadRequest(c, "Event ID is required")
                }

                types, err := ticketService.GetEventTicketTypes(eventID)
                if err != nil {
                        return response.InternalError(c, "Failed to retrieve ticket types")
                }

                return response.OK(c, types)
        }
}
