package handlers

import (
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
	"eventku/internal/models"
)

// GetAdminTicketTypes - admin can view all ticket types
func GetAdminTicketTypes(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		var ticketTypes []models.TicketType
		if err := db.Find(&ticketTypes).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch ticket types"})
		}
		return c.JSON(ticketTypes)
	}
}

// UpdateAdminTicketType - admin can update any ticket type (no organizer check)
func UpdateAdminTicketType(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ticketTypeID := c.Params("ticketTypeId")
		var ticketType models.TicketType
		if err := db.First(&ticketType, "id = ?", ticketTypeID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Ticket type not found"})
		}

		var req map[string]interface{}
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		updates := make(map[string]interface{})
		if name, ok := req["name"].(string); ok {
			updates["name"] = name
		}
		if price, ok := req["price"].(float64); ok {
			updates["price"] = price
		}
		if quota, ok := req["quota"].(float64); ok {
			updates["quota"] = int(quota)
		}
		if description, ok := req["description"].(string); ok {
			updates["description"] = description
		}
		if zone, ok := req["zone"].(string); ok {
			updates["zone"] = zone
		}

		if len(updates) > 0 {
			if err := db.Model(&ticketType).Updates(updates).Error; err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to update ticket type"})
			}
		}

		db.First(&ticketType, "id = ?", ticketTypeID)
		return c.JSON(ticketType)
	}
}

// DeleteAdminTicketType - admin can delete any ticket type
func DeleteAdminTicketType(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ticketTypeID := c.Params("ticketTypeId")
		var ticketType models.TicketType
		if err := db.First(&ticketType, "id = ?", ticketTypeID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "Ticket type not found"})
		}
		if err := db.Delete(&ticketType).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete ticket type"})
		}
		return c.JSON(fiber.Map{"message": "Ticket type deleted"})
	}
}
