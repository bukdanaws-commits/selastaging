package handlers

import (
	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

// GetAdminTicketTypes - admin can view all ticket types
func GetAdminTicketTypes(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		type TicketType struct {
			ID          string  ` + "`" + `json:"id"` + "`" + `
			EventID     string  ` + "`" + `json:"event_id"` + "`" + `
			Name        string  ` + "`" + `json:"name"` + "`" + `
			Price       float64 ` + "`" + `json:"price"` + "`" + `
			Quota       int     ` + "`" + `json:"quota"` + "`" + `
			Description string  ` + "`" + `json:"description"` + "`" + `
			Zone        string  ` + "`" + `json:"zone"` + "`" + `
		}
		var ticketTypes []TicketType
		if err := db.Table("ticket_types").Find(&ticketTypes).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch ticket types"})
		}
		return c.JSON(ticketTypes)
	}
}

// UpdateAdminTicketType - admin can update any ticket type (no organizer check)
func UpdateAdminTicketType(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ticketTypeID := c.Params("ticketTypeId")
		if ticketTypeID == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Ticket type ID is required"})
		}

		// Check if ticket type exists
		var count int64
		db.Table("ticket_types").Where("id = ?", ticketTypeID).Count(&count)
		if count == 0 {
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
			if err := db.Table("ticket_types").Where("id = ?", ticketTypeID).Updates(updates).Error; err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "Failed to update ticket type"})
			}
		}

		// Return updated ticket type
		type TicketType struct {
			ID          string  ` + "`" + `json:"id"` + "`" + `
			EventID     string  ` + "`" + `json:"event_id"` + "`" + `
			Name        string  ` + "`" + `json:"name"` + "`" + `
			Price       float64 ` + "`" + `json:"price"` + "`" + `
			Quota       int     ` + "`" + `json:"quota"` + "`" + `
			Description string  ` + "`" + `json:"description"` + "`" + `
			Zone        string  ` + "`" + `json:"zone"` + "`" + `
		}
		var ticketType TicketType
		db.Table("ticket_types").Where("id = ?", ticketTypeID).First(&ticketType)
		return c.JSON(ticketType)
	}
}

// DeleteAdminTicketType - admin can delete any ticket type
func DeleteAdminTicketType(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ticketTypeID := c.Params("ticketTypeId")
		if ticketTypeID == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Ticket type ID is required"})
		}

		var count int64
		db.Table("ticket_types").Where("id = ?", ticketTypeID).Count(&count)
		if count == 0 {
			return c.Status(404).JSON(fiber.Map{"error": "Ticket type not found"})
		}

		if err := db.Table("ticket_types").Where("id = ?", ticketTypeID).Delete(nil).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to delete ticket type"})
		}
		return c.JSON(fiber.Map{"message": "Ticket type deleted"})
	}
}
