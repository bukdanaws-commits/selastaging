package handlers

import (
	"github.com/bukdanaws-commits/seleevent/backend/internal/models"
	"github.com/bukdanaws-commits/seleevent/backend/internal/services"
	"github.com/bukdanaws-commits/seleevent/backend/pkg/response"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// counterScanRequest represents the request body for scanning and redeeming at a counter.
type counterScanRequest struct {
	TicketCode    string `json:"ticketCode"`
	CounterID     string `json:"counterId"`
	WristbandCode string `json:"wristbandCode"`
	Notes         string `json:"notes,omitempty"`
}

// CounterScan handles POST /api/v1/counter/scan
// Requires COUNTER_STAFF role.
func CounterScan(db *gorm.DB) fiber.Handler {
	counterService := services.NewCounterService(db)
	return func(c *fiber.Ctx) error {
		staffID, ok := c.Locals("userID").(string)
		if !ok {
			return response.Unauthorized(c, "Not authenticated")
		}

		var req counterScanRequest
		if err := c.BodyParser(&req); err != nil {
			return response.BadRequest(c, "Invalid request body")
		}
		if req.TicketCode == "" || req.CounterID == "" || req.WristbandCode == "" {
			return response.BadRequest(c, "ticketCode, counterId, and wristbandCode are required")
		}

		result, err := counterService.ScanAndRedeem(req.TicketCode, req.CounterID, staffID, req.WristbandCode, req.Notes)
		if err != nil {
			return response.InternalError(c, "Redemption failed")
		}

		if !result.Success {
			return c.JSON(fiber.Map{
				"success": false,
				"error":   result.Error,
			})
		}

		return response.OK(c, result)
	}
}

// GetCounterRedemptions handles GET /api/v1/counter/redemptions
// Requires COUNTER_STAFF role.
func GetCounterRedemptions(db *gorm.DB) fiber.Handler {
	counterService := services.NewCounterService(db)
	return func(c *fiber.Ctx) error {
		staffID, ok := c.Locals("userID").(string)
		if !ok {
			return response.Unauthorized(c, "Not authenticated")
		}

		page := c.QueryInt("page", 1)
		perPage := c.QueryInt("perPage", 20)
		if page < 1 {
			page = 1
		}
		if perPage < 1 || perPage > 100 {
			perPage = 20
		}
		offset := (page - 1) * perPage

		redemptions, total, err := counterService.GetMyRedemptions(staffID, perPage, offset)
		if err != nil {
			return response.InternalError(c, "Failed to retrieve redemptions")
		}

		return response.Paginated(c, redemptions, total, page, perPage)
	}
}

// GetCounterStatus handles GET /api/v1/counter/status
// Requires COUNTER_STAFF role.
func GetCounterStatus(db *gorm.DB) fiber.Handler {
	counterService := services.NewCounterService(db)
	return func(c *fiber.Ctx) error {
		staffID, ok := c.Locals("userID").(string)
		if !ok {
			return response.Unauthorized(c, "Not authenticated")
		}

		counterID := c.Query("counterId")
		if counterID == "" {
			// Try to find counter from staff assignment
			var assignment models.CounterStaff
			if err := db.Where("user_id = ? AND status = ?", staffID, "active").First(&assignment).Error; err != nil {
				return response.BadRequest(c, "No counter assignment found for this staff")
			}
			counterID = assignment.CounterID
		}

		result, err := counterService.GetCounterStatus(counterID, staffID)
		if err != nil {
			return response.InternalError(c, "Failed to retrieve counter status")
		}

		return response.OK(c, result)
	}
}

// GetCounterInventory handles GET /api/v1/counter/inventory
// Requires COUNTER_STAFF role.
func GetCounterInventory(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		counterID := c.Query("counterId")
		if counterID == "" {
			return response.BadRequest(c, "counterId query parameter is required")
		}

		// Find counter to get event ID
		var counter models.Counter
		if err := db.Where("id = ?", counterID).First(&counter).Error; err != nil {
			return response.NotFound(c, "Counter not found")
		}

		var inventory []models.WristbandInventory
		if err := db.Where("event_id = ?", counter.EventID).Find(&inventory).Error; err != nil {
			return response.InternalError(c, "Failed to retrieve inventory")
		}

		return response.OK(c, fiber.Map{
			"inventory": inventory,
		})
	}
}

// GetCounterGuide handles GET /api/v1/counter/guide
// Returns wristband color mapping based on ticket types.
// Requires COUNTER_STAFF role.
func GetCounterGuide(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Hardcoded wristband guide for SeleEvent (Sheila On 7 concert)
		guide := []fiber.Map{
			{
				"ticketType":     "VVIP Premium",
				"wristbandColor": "Gold",
				"wristbandType":  "VVIP Gold",
				"colorHex":       "#FFD700",
				"description":    "Premium VVIP experience - front stage, meet & greet",
			},
			{
				"ticketType":     "VIP",
				"wristbandColor": "Teal",
				"wristbandType":  "VIP Teal",
				"colorHex":       "#008080",
				"description":    "VIP zone access - premium viewing area",
			},
			{
				"ticketType":     "Festival",
				"wristbandColor": "Orange",
				"wristbandType":  "Festival Orange",
				"colorHex":       "#FFA500",
				"description":    "Festival standing zone",
			},
			{
				"ticketType":     "CAT 1",
				"wristbandColor": "Merah",
				"wristbandType":  "CAT 1 Merah",
				"colorHex":       "#FF0000",
				"description":    "Category 1 - closest tribun section",
			},
			{
				"ticketType":     "CAT 2",
				"wristbandColor": "Biru",
				"wristbandType":  "CAT 2 Biru",
				"colorHex":       "#0000FF",
				"description":    "Category 2 - mid tribun section",
			},
			{
				"ticketType":     "CAT 3",
				"wristbandColor": "Hijau",
				"wristbandType":  "CAT 3 Hijau",
				"colorHex":       "#008000",
				"description":    "Category 3 - upper tribun section",
			},
			{
				"ticketType":     "CAT 4",
				"wristbandColor": "Ungu",
				"wristbandType":  "CAT 4 Ungu",
				"colorHex":       "#800080",
				"description":    "Category 4 - back tribun section",
			},
			{
				"ticketType":     "CAT 5",
				"wristbandColor": "Putih",
				"wristbandType":  "CAT 5 Putih",
				"colorHex":       "#FFFFFF",
				"description":    "Category 5 - furthest tribun section",
			},
		}

		return response.OK(c, fiber.Map{
			"guide": guide,
		})
	}
}
