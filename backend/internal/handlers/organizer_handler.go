package handlers

import (
        "time"

        "github.com/bukdanaws-commits/seleevent/backend/internal/models"
        "github.com/bukdanaws-commits/seleevent/backend/internal/services"
        "github.com/bukdanaws-commits/seleevent/backend/pkg/response"
        "github.com/gofiber/fiber/v2"
        "gorm.io/gorm"
)

// GetOrganizerDashboardStats handles GET /api/v1/organizer/dashboard/stats
func GetOrganizerDashboardStats(db *gorm.DB) fiber.Handler {
        statsService := services.NewStatsService(db)
        return func(c *fiber.Ctx) error {
                eventID := c.Query("eventId")
                if eventID == "" {
                        return response.BadRequest(c, "eventId query parameter is required")
                }

                result, err := statsService.GetDashboardStats(eventID)
                if err != nil {
                        return response.InternalError(c, "Failed to retrieve dashboard stats")
                }

                return response.OK(c, result)
        }
}

// GetOrganizerLiveMonitor handles GET /api/v1/organizer/live-monitor
func GetOrganizerLiveMonitor(db *gorm.DB) fiber.Handler {
        statsService := services.NewStatsService(db)
        return func(c *fiber.Ctx) error {
                eventID := c.Query("eventId")
                if eventID == "" {
                        return response.BadRequest(c, "eventId query parameter is required")
                }

                result, err := statsService.GetLiveStats(eventID)
                if err != nil {
                        return response.InternalError(c, "Failed to retrieve live stats")
                }

                return response.OK(c, result)
        }
}

// GetOrganizerRedemptions handles GET /api/v1/organizer/redemptions
func GetOrganizerRedemptions(db *gorm.DB) fiber.Handler {
        return func(c *fiber.Ctx) error {
                eventID := c.Query("eventId")
                if eventID == "" {
                        return response.BadRequest(c, "eventId query parameter is required")
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

                var redemptions []models.Redemption
                var total int64

                query := db.Model(&models.Redemption{}).
                        Joins("JOIN tickets ON tickets.id = redemptions.ticket_id").
                        Joins("JOIN orders ON orders.id = tickets.order_id").
                        Where("orders.event_id = ?", eventID)

                query.Count(&total)
                err := query.
                        Preload("Ticket").
                        Preload("Ticket.Order").
                        Preload("Counter").
                        Preload("Staff").
                        Order("redeemed_at DESC").
                        Limit(perPage).
                        Offset(offset).
                        Find(&redemptions).Error

                if err != nil {
                        return response.InternalError(c, "Failed to retrieve redemptions")
                }

                return response.Paginated(c, redemptions, total, page, perPage)
        }
}

// GetOrganizerCounters handles GET /api/v1/organizer/counters
func GetOrganizerCounters(db *gorm.DB) fiber.Handler {
        return func(c *fiber.Ctx) error {
                eventID := c.Query("eventId")
                if eventID == "" {
                        return response.BadRequest(c, "eventId query parameter is required")
                }

                var counters []models.Counter
                if err := db.Where("event_id = ?", eventID).Find(&counters).Error; err != nil {
                        return response.InternalError(c, "Failed to retrieve counters")
                }

                type enrichedCounter struct {
                        models.Counter
                        StaffCount      int64 `json:"staffCount"`
                        RedemptionCount int64 `json:"redemptionCount"`
                }

                result := make([]enrichedCounter, len(counters))
                for i, cnt := range counters {
                        ec := enrichedCounter{Counter: cnt}
                        db.Model(&models.CounterStaff{}).Where("counter_id = ? AND status = ?", cnt.ID, "active").Count(&ec.StaffCount)
                        db.Model(&models.Redemption{}).Where("counter_id = ?", cnt.ID).Count(&ec.RedemptionCount)
                        result[i] = ec
                }

                return response.OK(c, result)
        }
}

// GetOrganizerGates handles GET /api/v1/organizer/gates
func GetOrganizerGates(db *gorm.DB) fiber.Handler {
        return func(c *fiber.Ctx) error {
                eventID := c.Query("eventId")
                if eventID == "" {
                        return response.BadRequest(c, "eventId query parameter is required")
                }

                var gates []models.Gate
                if err := db.Where("event_id = ?", eventID).Find(&gates).Error; err != nil {
                        return response.InternalError(c, "Failed to retrieve gates")
                }

                type enrichedGate struct {
                        models.Gate
                        StaffCount int64 `json:"staffCount"`
                        ScanCount  int64 `json:"scanCount"`
                        TodayIn    int64 `json:"todayIn"`
                        TodayOut   int64 `json:"todayOut"`
                }

                today := time.Now().Truncate(24 * time.Hour)
                result := make([]enrichedGate, len(gates))
                for i, g := range gates {
                        eg := enrichedGate{Gate: g}
                        db.Model(&models.GateStaff{}).Where("gate_id = ? AND status = ?", g.ID, "active").Count(&eg.StaffCount)
                        db.Model(&models.GateLog{}).Where("gate_id = ?", g.ID).Count(&eg.ScanCount)
                        db.Model(&models.GateLog{}).Where("gate_id = ? AND action = ? AND scanned_at >= ?", g.ID, "IN", today).Count(&eg.TodayIn)
                        db.Model(&models.GateLog{}).Where("gate_id = ? AND action = ? AND scanned_at >= ?", g.ID, "OUT", today).Count(&eg.TodayOut)
                        result[i] = eg
                }

                return response.OK(c, result)
        }
}

// GetOrganizerTickets handles GET /api/v1/organizer/tickets
func GetOrganizerTickets(db *gorm.DB) fiber.Handler {
        return func(c *fiber.Ctx) error {
                eventID := c.Query("eventId")
                if eventID == "" {
                        return response.BadRequest(c, "eventId query parameter is required")
                }

                page := c.QueryInt("page", 1)
                perPage := c.QueryInt("perPage", 20)
                status := c.Query("status")

                if page < 1 {
                        page = 1
                }
                if perPage < 1 || perPage > 100 {
                        perPage = 20
                }
                offset := (page - 1) * perPage

                var tickets []models.Ticket
                var total int64

                query := db.Model(&models.Ticket{}).
                        Joins("JOIN orders ON orders.id = tickets.order_id").
                        Where("orders.event_id = ?", eventID)

                if status != "" {
                        query = query.Where("tickets.status = ?", status)
                }

                query.Count(&total)
                err := query.
                        Preload("Order").
                        Order("tickets.created_at DESC").
                        Limit(perPage).
                        Offset(offset).
                        Find(&tickets).Error

                if err != nil {
                        return response.InternalError(c, "Failed to retrieve tickets")
                }

                return response.Paginated(c, tickets, total, page, perPage)
        }
}

// GetOrganizerStaff handles GET /api/v1/organizer/staff
func GetOrganizerStaff(db *gorm.DB) fiber.Handler {
        return func(c *fiber.Ctx) error {
                eventID := c.Query("eventId")
                role := c.Query("role")

                if eventID == "" {
                        return response.BadRequest(c, "eventId query parameter is required")
                }

                type staffMember struct {
                        ID         string    `json:"id"`
                        UserID     string    `json:"userId"`
                        Name       string    `json:"name"`
                        Email      string    `json:"email"`
                        Role       string    `json:"role"`
                        Shift      *string   `json:"shift"`
                        Status     string    `json:"status"`
                        Assignment string    `json:"assignment"`
                        Location   string    `json:"location"`
                        AssignedAt time.Time `json:"assignedAt"`
                }

                var result []staffMember

                if role == "" || role == "COUNTER_STAFF" {
                        var counterStaff []models.CounterStaff
                        db.Joins("JOIN counters ON counters.id = counter_staff.counter_id").
                                Where("counters.event_id = ? AND counter_staff.status = ?", eventID, "active").
                                Preload("User").
                                Find(&counterStaff)

                        for _, cs := range counterStaff {
                                var counter models.Counter
                                db.Where("id = ?", cs.CounterID).First(&counter)
                                loc := ""
                                if counter.Location != nil {
                                        loc = *counter.Location
                                }
                                result = append(result, staffMember{
                                        ID:         cs.ID,
                                        UserID:     cs.UserID,
                                        Name:       cs.User.Name,
                                        Email:      cs.User.Email,
                                        Role:       "COUNTER_STAFF",
                                        Shift:      cs.Shift,
                                        Status:     cs.Status,
                                        Assignment: "counter",
                                        Location:   loc,
                                        AssignedAt: cs.AssignedAt,
                                })
                        }
                }

                if role == "" || role == "GATE_STAFF" {
                        var gateStaff []models.GateStaff
                        db.Joins("JOIN gates ON gates.id = gate_staff.gate_id").
                                Where("gates.event_id = ? AND gate_staff.status = ?", eventID, "active").
                                Preload("User").
                                Find(&gateStaff)

                        for _, gs := range gateStaff {
                                var gate models.Gate
                                db.Where("id = ?", gs.GateID).First(&gate)
                                loc := ""
                                if gate.Location != nil {
                                        loc = *gate.Location
                                }
                                result = append(result, staffMember{
                                        ID:         gs.ID,
                                        UserID:     gs.UserID,
                                        Name:       gs.User.Name,
                                        Email:      gs.User.Email,
                                        Role:       "GATE_STAFF",
                                        Shift:      gs.Shift,
                                        Status:     gs.Status,
                                        Assignment: "gate",
                                        Location:   loc,
                                        AssignedAt: gs.AssignedAt,
                                })
                        }
                }

                return response.OK(c, result)
        }
}

// GetOrganizerWristbandInventory handles GET /api/v1/organizer/wristband-inventory
func GetOrganizerWristbandInventory(db *gorm.DB) fiber.Handler {
        return func(c *fiber.Ctx) error {
                eventID := c.Query("eventId")
                if eventID == "" {
                        return response.BadRequest(c, "eventId query parameter is required")
                }

                var inventory []models.WristbandInventory
                if err := db.Where("event_id = ?", eventID).Find(&inventory).Error; err != nil {
                        return response.InternalError(c, "Failed to retrieve wristband inventory")
                }

                return response.OK(c, fiber.Map{
                        "inventory": inventory,
                })
        }
}

// GetOrganizerWristbandGuide handles GET /api/v1/organizer/wristband-guide
func GetOrganizerWristbandGuide(db *gorm.DB) fiber.Handler {
        return func(c *fiber.Ctx) error {
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
