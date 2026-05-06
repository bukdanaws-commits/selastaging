package handlers

import (
        "strconv"
        "time"

        "github.com/bukdanaws-commits/seleevent/backend/internal/models"
        "github.com/bukdanaws-commits/seleevent/backend/internal/services"
        "github.com/bukdanaws-commits/seleevent/backend/pkg/response"
        "github.com/gofiber/fiber/v3"
        "gorm.io/gorm"
)

// gateScanRequest represents the request body for scanning at a gate.
type gateScanRequest struct {
        TicketCode string `json:"ticketCode"`
        GateID     string `json:"gateId"`
        Action     string `json:"action"`
        Notes      string `json:"notes,omitempty"`
}

// GateScan handles POST /api/v1/gate/scan
// Requires GATE_STAFF role.
func GateScan(db *gorm.DB) fiber.Handler {
        gateService := services.NewGateService(db)
        return func(c fiber.Ctx) error {
                staffID, ok := c.Locals("userID").(string)
                if !ok {
                        return response.Unauthorized(c, "Not authenticated")
                }

                var req gateScanRequest
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }
                if req.TicketCode == "" || req.GateID == "" || req.Action == "" {
                        return response.BadRequest(c, "ticketCode, gateId, and action are required")
                }
                if req.Action != "IN" && req.Action != "OUT" {
                        return response.BadRequest(c, "action must be IN or OUT")
                }

                result, err := gateService.ScanTicket(req.TicketCode, req.GateID, staffID, req.Action)
                if err != nil {
                        return response.InternalError(c, "Scan failed")
                }

                if !result.Success {
                        return c.JSON(fiber.Map{
                                "success": false,
                                "error":   result.Error,
                                "action":  result.Action,
                        })
                }

                return response.OK(c, result)
        }
}

// GetGateLogs handles GET /api/v1/gate/logs
// Requires GATE_STAFF role.
func GetGateLogs(db *gorm.DB) fiber.Handler {
        gateService := services.NewGateService(db)
        return func(c fiber.Ctx) error {
                gateID := c.Query("gateId")
                if gateID == "" {
                        return response.BadRequest(c, "gateId query parameter is required")
                }

                page, _ := strconv.Atoi(c.Query("page", "1"))
                perPage, _ := strconv.Atoi(c.Query("perPage", "20"))
                if page < 1 {
                        page = 1
                }
                if perPage < 1 || perPage > 100 {
                        perPage = 20
                }
                offset := (page - 1) * perPage

                logs, total, err := gateService.GetGateLogs(gateID, perPage, offset)
                if err != nil {
                        return response.InternalError(c, "Failed to retrieve gate logs")
                }

                return response.Paginated(c, logs, total, page, perPage)
        }
}

// GetGateStatus handles GET /api/v1/gate/status
// Requires GATE_STAFF role.
func GetGateStatus(db *gorm.DB) fiber.Handler {
        gateService := services.NewGateService(db)
        return func(c fiber.Ctx) error {
                staffID, ok := c.Locals("userID").(string)
                if !ok {
                        return response.Unauthorized(c, "Not authenticated")
                }

                gateID := c.Query("gateId")
                if gateID == "" {
                        // Try to find gate from staff assignment
                        var assignment models.GateStaff
                        if err := db.Where("user_id = ? AND status = ?", staffID, "active").First(&assignment).Error; err != nil {
                                return response.BadRequest(c, "No gate assignment found for this staff")
                        }
                        gateID = assignment.GateID
                }

                result, err := gateService.GetGateStatus(gateID, staffID)
                if err != nil {
                        return response.InternalError(c, "Failed to retrieve gate status")
                }

                return response.OK(c, result)
        }
}

// GetGateProfile handles GET /api/v1/gate/profile
// Requires GATE_STAFF role. Returns staff info + gate assignment + today's stats.
func GetGateProfile(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                staffID, ok := c.Locals("userID").(string)
                if !ok {
                        return response.Unauthorized(c, "Not authenticated")
                }

                // Get staff user info
                var user models.User
                if err := db.Where("id = ?", staffID).First(&user).Error; err != nil {
                        return response.NotFound(c, "Staff not found")
                }

                // Get gate assignment
                var assignment models.GateStaff
                if err := db.Where("user_id = ? AND status = ?", staffID, "active").First(&assignment).Error; err != nil {
                        return response.NotFound(c, "No gate assignment found")
                }

                // Get gate details
                var gate models.Gate
                if err := db.Where("id = ?", assignment.GateID).First(&gate).Error; err != nil {
                        return response.NotFound(c, "Gate not found")
                }

                // Get today's scan count for this staff
                var todayScans int64
                today := time.Now().Truncate(24 * time.Hour)
                db.Model(&models.GateLog{}).
                        Where("staff_id = ? AND scanned_at >= ?", staffID, today).
                        Count(&todayScans)

                return response.OK(c, fiber.Map{
                        "staff":      &user,
                        "gate":       &gate,
                        "assignment": &assignment,
                        "todayScans": todayScans,
                })
        }
}
