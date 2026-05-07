package handlers

import (
        "fmt"
        "strconv"
        "time"

        "github.com/bukdanaws-commits/seleevent/backend/internal/models"
        "github.com/bukdanaws-commits/seleevent/backend/internal/services"
        "github.com/bukdanaws-commits/seleevent/backend/pkg/response"
        "github.com/gofiber/fiber/v3"
        "gorm.io/gorm"
)

// GetAdminDashboard handles GET /api/v1/admin/dashboard
func GetAdminDashboard(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                // Aggregate admin dashboard KPIs
                var totalUsers, totalOrders, paidOrders, pendingOrders, totalTickets int64
                var totalRevenue int64

                db.Model(&models.User{}).Count(&totalUsers)
                db.Model(&models.Order{}).Count(&totalOrders)
                db.Model(&models.Order{}).Where("status = ?", "paid").Count(&paidOrders)
                db.Model(&models.Order{}).Where("status = ?", "pending").Count(&pendingOrders)
                db.Model(&models.Ticket{}).Count(&totalTickets)
                db.Model(&models.Order{}).Where("status = ?", "paid").
                        Select("COALESCE(SUM(total_amount), 0)").Scan(&totalRevenue)

                return response.OK(c, fiber.Map{
                        "totalUsers":    totalUsers,
                        "totalOrders":   totalOrders,
                        "paidOrders":    paidOrders,
                        "pendingOrders": pendingOrders,
                        "totalTickets":  totalTickets,
                        "totalRevenue":  totalRevenue,
                })
        }
}

// GetAdminOrders handles GET /api/v1/admin/orders
func GetAdminOrders(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                page, _ := strconv.Atoi(c.Query("page", "1"))
                perPage, _ := strconv.Atoi(c.Query("perPage", "20"))
                status := c.Query("status")

                if page < 1 {
                        page = 1
                }
                if perPage < 1 || perPage > 100 {
                        perPage = 20
                }
                offset := (page - 1) * perPage

                var orders []models.Order
                var total int64

                query := db.Model(&models.Order{})
                if status != "" {
                        query = query.Where("status = ?", status)
                }

                query.Count(&total)
                err := query.
                        Preload("User").
                        Preload("Event").
                        Preload("Items").
                        Order("created_at DESC").
                        Limit(perPage).
                        Offset(offset).
                        Find(&orders).Error

                if err != nil {
                        return response.InternalError(c, "Failed to retrieve orders")
                }

                return response.Paginated(c, orders, total, page, perPage)
        }
}

// GetAdminUsers handles GET /api/v1/admin/users
func GetAdminUsers(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                page, _ := strconv.Atoi(c.Query("page", "1"))
                perPage, _ := strconv.Atoi(c.Query("perPage", "20"))
                role := c.Query("role")

                if page < 1 {
                        page = 1
                }
                if perPage < 1 || perPage > 100 {
                        perPage = 20
                }
                offset := (page - 1) * perPage

                var users []models.User
                var total int64

                query := db.Model(&models.User{})
                if role != "" {
                        query = query.Where("role = ?", role)
                }

                query.Count(&total)
                err := query.
                        Order("created_at DESC").
                        Limit(perPage).
                        Offset(offset).
                        Find(&users).Error

                if err != nil {
                        return response.InternalError(c, "Failed to retrieve users")
                }

                return response.Paginated(c, users, total, page, perPage)
        }
}

// GetAdminEvents handles GET /api/v1/admin/events
func GetAdminEvents(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                var events []models.Event
                if err := db.Preload("TicketTypes").
                        Order("created_at DESC").
                        Find(&events).Error; err != nil {
                        return response.InternalError(c, "Failed to retrieve events")
                }

                return response.OK(c, events)
        }
}

// GetAdminAnalytics handles GET /api/v1/admin/analytics
func GetAdminAnalytics(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                eventID := c.Query("eventId")

                var totalOrders int64
                var paidOrders int64
                var totalRevenue int64
                var totalTickets int64

                query := db.Model(&models.Order{})
                if eventID != "" {
                        query = query.Where("event_id = ?", eventID)
                }

                query.Count(&totalOrders)

                paidQuery := db.Model(&models.Order{}).Where("status = ?", "paid")
                if eventID != "" {
                        paidQuery = paidQuery.Where("event_id = ?", eventID)
                }
                paidQuery.Count(&paidOrders)

                revenueQuery := db.Model(&models.Order{}).Where("status = ?", "paid")
                if eventID != "" {
                        revenueQuery = revenueQuery.Where("event_id = ?", eventID)
                }
                revenueQuery.Select("COALESCE(SUM(total_amount), 0)").Scan(&totalRevenue)

                ticketQuery := db.Model(&models.Ticket{})
                if eventID != "" {
                        ticketQuery = ticketQuery.Joins("JOIN orders ON orders.id = tickets.order_id").Where("orders.event_id = ?", eventID)
                }
                ticketQuery.Count(&totalTickets)

                // Ticket status breakdown
                type statusCount struct {
                        Status string
                        Count  int64
                }
                var statusBreakdown []statusCount

                sbQuery := db.Model(&models.Ticket{}).Select("status, COUNT(*) as count").Group("status")
                if eventID != "" {
                        sbQuery = sbQuery.Joins("JOIN orders ON orders.id = tickets.order_id").Where("orders.event_id = ?", eventID)
                }
                sbQuery.Scan(&statusBreakdown)

                breakdownMap := make(map[string]int64)
                for _, sb := range statusBreakdown {
                        breakdownMap[sb.Status] = sb.Count
                }

                return response.OK(c, fiber.Map{
                        "totalOrders":    totalOrders,
                        "paidOrders":     paidOrders,
                        "totalRevenue":   totalRevenue,
                        "totalTickets":   totalTickets,
                        "statusBreakdown": breakdownMap,
                })
        }
}

// ─── ADMIN EXTENDED ENDPOINTS ──────────────────────────────────────────────

// GetAdminTickets handles GET /api/v1/admin/tickets
// List all tickets with pagination, filtering by status/eventId.
func GetAdminTickets(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                page, _ := strconv.Atoi(c.Query("page", "1"))
                perPage, _ := strconv.Atoi(c.Query("perPage", "20"))
                status := c.Query("status")
                eventID := c.Query("eventId")

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
                        Joins("JOIN orders ON orders.id = tickets.order_id")

                if eventID != "" {
                        query = query.Where("orders.event_id = ?", eventID)
                }
                if status != "" {
                        query = query.Where("tickets.status = ?", status)
                }

                query.Count(&total)
                err := query.
                        Preload("Order").
                        Preload("Order.User").
                        Preload("Order.Event").
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

// GetAdminStaff handles GET /api/v1/admin/staff
// List all counter staff + gate staff with unified format.
func GetAdminStaff(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                page, _ := strconv.Atoi(c.Query("page", "1"))
                perPage, _ := strconv.Atoi(c.Query("perPage", "20"))
                eventID := c.Query("eventId")
                role := c.Query("role")

                if page < 1 {
                        page = 1
                }
                if perPage < 1 || perPage > 100 {
                        perPage = 20
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
                        q := db.Joins("JOIN counters ON counters.id = counter_staff.counter_id")
                        if eventID != "" {
                                q = q.Where("counters.event_id = ?", eventID)
                        }
                        q.Preload("User").Find(&counterStaff)

                        for _, cs := range counterStaff {
                                var counter models.Counter
                                db.Where("id = ?", cs.CounterID).First(&counter)
                                loc := ""
                                if counter.Location != nil {
                                        loc = *counter.Location
                                }
                                name := cs.UserID
                                email := ""
                                if cs.User.ID != "" {
                                        name = cs.User.Name
                                        email = cs.User.Email
                                }
                                result = append(result, staffMember{
                                        ID:         cs.ID,
                                        UserID:     cs.UserID,
                                        Name:       name,
                                        Email:      email,
                                        Role:       "COUNTER_STAFF",
                                        Shift:      cs.Shift,
                                        Status:     cs.Status,
                                        Assignment: counter.Name,
                                        Location:   loc,
                                        AssignedAt: cs.AssignedAt,
                                })
                        }
                }

                if role == "" || role == "GATE_STAFF" {
                        var gateStaff []models.GateStaff
                        q := db.Joins("JOIN gates ON gates.id = gate_staff.gate_id")
                        if eventID != "" {
                                q = q.Where("gates.event_id = ?", eventID)
                        }
                        q.Preload("User").Find(&gateStaff)

                        for _, gs := range gateStaff {
                                var gate models.Gate
                                db.Where("id = ?", gs.GateID).First(&gate)
                                loc := ""
                                if gate.Location != nil {
                                        loc = *gate.Location
                                }
                                name := gs.UserID
                                email := ""
                                if gs.User.ID != "" {
                                        name = gs.User.Name
                                        email = gs.User.Email
                                }
                                result = append(result, staffMember{
                                        ID:         gs.ID,
                                        UserID:     gs.UserID,
                                        Name:       name,
                                        Email:      email,
                                        Role:       "GATE_STAFF",
                                        Shift:      gs.Shift,
                                        Status:     gs.Status,
                                        Assignment: gate.Name,
                                        Location:   loc,
                                        AssignedAt: gs.AssignedAt,
                                })
                        }
                }

                // Apply pagination to the combined result
                total := int64(len(result))
                offset := (page - 1) * perPage
                if offset > int(total) {
                        offset = int(total)
                }
                end := offset + perPage
                if end > int(total) {
                        end = int(total)
                }

                return response.Paginated(c, result[offset:end], total, page, perPage)
        }
}

// GetAdminCounters handles GET /api/v1/admin/counters
// List all counters with staff info and redemption counts.
func GetAdminCounters(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                page, _ := strconv.Atoi(c.Query("page", "1"))
                perPage, _ := strconv.Atoi(c.Query("perPage", "20"))
                eventID := c.Query("eventId")

                if page < 1 {
                        page = 1
                }
                if perPage < 1 || perPage > 100 {
                        perPage = 20
                }
                offset := (page - 1) * perPage

                var counters []models.Counter
                var total int64

                query := db.Model(&models.Counter{})
                if eventID != "" {
                        query = query.Where("event_id = ?", eventID)
                }

                query.Count(&total)
                err := query.
                        Preload("Event").
                        Order("created_at DESC").
                        Limit(perPage).
                        Offset(offset).
                        Find(&counters).Error

                if err != nil {
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

                return response.Paginated(c, result, total, page, perPage)
        }
}

// GetAdminGates handles GET /api/v1/admin/gates
// List all gates with staff info and scan counts.
func GetAdminGates(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                page, _ := strconv.Atoi(c.Query("page", "1"))
                perPage, _ := strconv.Atoi(c.Query("perPage", "20"))
                eventID := c.Query("eventId")

                if page < 1 {
                        page = 1
                }
                if perPage < 1 || perPage > 100 {
                        perPage = 20
                }
                offset := (page - 1) * perPage

                var gates []models.Gate
                var total int64

                query := db.Model(&models.Gate{})
                if eventID != "" {
                        query = query.Where("event_id = ?", eventID)
                }

                query.Count(&total)
                err := query.
                        Preload("Event").
                        Order("created_at DESC").
                        Limit(perPage).
                        Offset(offset).
                        Find(&gates).Error

                if err != nil {
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

                return response.Paginated(c, result, total, page, perPage)
        }
}

// GetAdminGateMonitoring handles GET /api/v1/admin/gate-monitoring
// Real-time gate monitoring data.
func GetAdminGateMonitoring(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                eventID := c.Query("eventId")

                query := db.Model(&models.Gate{})
                if eventID != "" {
                        query = query.Where("event_id = ?", eventID)
                }

                var gates []models.Gate
                if err := query.Preload("Staff").Preload("Staff.User").Find(&gates).Error; err != nil {
                        return response.InternalError(c, "Failed to retrieve gate monitoring data")
                }

                type gateMonitor struct {
                        GateID            string    `json:"gateId"`
                        GateName          string    `json:"gateName"`
                        GateType          string    `json:"gateType"`
                        Status            string    `json:"status"`
                        StaffCount        int64     `json:"staffCount"`
                        TotalScans        int64     `json:"totalScans"`
                        TodayIn           int64     `json:"todayIn"`
                        TodayOut          int64     `json:"todayOut"`
                        ThroughputPerMin  float64   `json:"throughputPerMin"`
                        LastScanAt        *time.Time `json:"lastScanAt,omitempty"`
                        RecentScans       []models.GateLog `json:"recentScans"`
                }

                today := time.Now().Truncate(24 * time.Hour)
                oneHourAgo := time.Now().Add(-1 * time.Hour)
                result := make([]gateMonitor, len(gates))

                for i, g := range gates {
                        gm := gateMonitor{
                                GateID:   g.ID,
                                GateName: g.Name,
                                GateType: g.Type,
                                Status:   g.Status,
                        }

                        db.Model(&models.GateStaff{}).Where("gate_id = ? AND status = ?", g.ID, "active").Count(&gm.StaffCount)
                        db.Model(&models.GateLog{}).Where("gate_id = ?", g.ID).Count(&gm.TotalScans)
                        db.Model(&models.GateLog{}).Where("gate_id = ? AND action = ? AND scanned_at >= ?", g.ID, "IN", today).Count(&gm.TodayIn)
                        db.Model(&models.GateLog{}).Where("gate_id = ? AND action = ? AND scanned_at >= ?", g.ID, "OUT", today).Count(&gm.TodayOut)

                        // Throughput: scans in last hour / 60
                        var lastHourScans int64
                        db.Model(&models.GateLog{}).Where("gate_id = ? AND scanned_at >= ?", g.ID, oneHourAgo).Count(&lastHourScans)
                        gm.ThroughputPerMin = float64(lastHourScans) / 60.0

                        // Last scan time
                        var lastLog models.GateLog
                        if db.Where("gate_id = ?", g.ID).Order("scanned_at DESC").First(&lastLog).Error == nil {
                                gm.LastScanAt = &lastLog.ScannedAt
                        }

                        // Recent scans (last 10)
                        var recent []models.GateLog
                        db.Where("gate_id = ?", g.ID).Order("scanned_at DESC").Limit(10).Preload("Ticket").Find(&recent)
                        gm.RecentScans = recent

                        result[i] = gm
                }

                return response.OK(c, result)
        }
}

// GetAdminVerifications handles GET /api/v1/admin/verifications
// List pending verifications (orders with status "pending").
func GetAdminVerifications(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                page, _ := strconv.Atoi(c.Query("page", "1"))
                perPage, _ := strconv.Atoi(c.Query("perPage", "20"))
                status := c.Query("status")
                if status == "" {
                        status = "pending"
                }

                if page < 1 {
                        page = 1
                }
                if perPage < 1 || perPage > 100 {
                        perPage = 20
                }
                offset := (page - 1) * perPage

                var orders []models.Order
                var total int64

                query := db.Model(&models.Order{}).Where("status = ?", status)

                query.Count(&total)
                err := query.
                        Preload("User").
                        Preload("Event").
                        Preload("Items").
                        Preload("Items.TicketType").
                        Preload("Tickets").
                        Order("created_at ASC").
                        Limit(perPage).
                        Offset(offset).
                        Find(&orders).Error

                if err != nil {
                        return response.InternalError(c, "Failed to retrieve verifications")
                }

                return response.Paginated(c, orders, total, page, perPage)
        }
}

// GetAdminSeats handles GET /api/v1/admin/seats
// Get seat configuration for an event.
func GetAdminSeats(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                eventID := c.Query("eventId")
                if eventID == "" {
                        return response.BadRequest(c, "eventId query parameter is required")
                }

                var ticketTypes []models.TicketType
                if err := db.Where("event_id = ?", eventID).Find(&ticketTypes).Error; err != nil {
                        return response.InternalError(c, "Failed to retrieve seat configuration")
                }

                type seatInfo struct {
                        TicketTypeID  string  `json:"ticketTypeId"`
                        Name          string  `json:"name"`
                        Tier          string  `json:"tier"`
                        Zone          *string `json:"zone"`
                        Quota         int     `json:"quota"`
                        Sold          int     `json:"sold"`
                        Available     int     `json:"available"`
                        SeatConfig    *string `json:"seatConfig,omitempty"`
                }

                result := make([]seatInfo, len(ticketTypes))
                for i, tt := range ticketTypes {
                        available := tt.Quota - tt.Sold
                        if available < 0 {
                                available = 0
                        }
                        result[i] = seatInfo{
                                TicketTypeID: tt.ID,
                                Name:         tt.Name,
                                Tier:         tt.Tier,
                                Zone:         tt.Zone,
                                Quota:        tt.Quota,
                                Sold:         tt.Sold,
                                Available:    available,
                                SeatConfig:   tt.SeatConfig,
                        }
                }

                // Overall stats
                var totalQuota, totalSold int
                for _, tt := range ticketTypes {
                        totalQuota += tt.Quota
                        totalSold += tt.Sold
                }
                totalAvailable := totalQuota - totalSold
                if totalAvailable < 0 {
                        totalAvailable = 0
                }

                return response.OK(c, fiber.Map{
                        "ticketTypes": result,
                        "summary": fiber.Map{
                                "totalQuota":     totalQuota,
                                "totalSold":      totalSold,
                                "totalAvailable": totalAvailable,
                        },
                })
        }
}

// GetAdminSettings handles GET /api/v1/admin/settings
// Get system settings/health info.
func GetAdminSettings(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                // DB health check
                sqlDB, err := db.DB()
                dbStatus := "healthy"
                var dbStats fiber.Map
                if err != nil {
                        dbStatus = "error: " + err.Error()
                } else {
                        stats := sqlDB.Stats()
                        dbStats = fiber.Map{
                                "maxOpenConnections": stats.MaxOpenConnections,
                                "openConnections":    stats.OpenConnections,
                                "inUse":              stats.InUse,
                                "idle":               stats.Idle,
                                "waitCount":          stats.WaitCount,
                                "waitDuration":       stats.WaitDuration.String(),
                                "maxIdleClosed":      stats.MaxIdleClosed,
                                "maxLifetimeClosed":  stats.MaxLifetimeClosed,
                        }
                }

                // SSE connections
                var sseClientCount int
                if services.Hub != nil {
                        sseClientCount = services.Hub.ClientCount()
                }

                // Quick table counts
                var userCount, orderCount, eventCount, ticketCount int64
                db.Model(&models.User{}).Count(&userCount)
                db.Model(&models.Order{}).Count(&orderCount)
                db.Model(&models.Event{}).Count(&eventCount)
                db.Model(&models.Ticket{}).Count(&ticketCount)

                return response.OK(c, fiber.Map{
                        "status":    "operational",
                        "timestamp": time.Now().Format(time.RFC3339),
                        "database": fiber.Map{
                                "status": dbStatus,
                                "stats":  dbStats,
                        },
                        "sse": fiber.Map{
                                "connectedClients": sseClientCount,
                        },
                        "counts": fiber.Map{
                                "users":   userCount,
                                "orders":  orderCount,
                                "events":  eventCount,
                                "tickets": ticketCount,
                        },
                        "version": "1.0.0",
                })
        }
}

// GetAdminCrewGates handles GET /api/v1/admin/crew-gates
// List crew-gate assignments with shift info.
func GetAdminCrewGates(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                page, _ := strconv.Atoi(c.Query("page", "1"))
                perPage, _ := strconv.Atoi(c.Query("perPage", "20"))
                eventID := c.Query("eventId")

                if page < 1 {
                        page = 1
                }
                if perPage < 1 || perPage > 100 {
                        perPage = 20
                }
                offset := (page - 1) * perPage

                var gateStaff []models.GateStaff
                var total int64

                query := db.Model(&models.GateStaff{}).
                        Joins("JOIN gates ON gates.id = gate_staff.gate_id")

                if eventID != "" {
                        query = query.Where("gates.event_id = ?", eventID)
                }

                query.Count(&total)
                err := query.
                        Preload("User").
                        Preload("Gate").
                        Preload("Gate.Event").
                        Order("gate_staff.assigned_at DESC").
                        Limit(perPage).
                        Offset(offset).
                        Find(&gateStaff).Error

                if err != nil {
                        return response.InternalError(c, "Failed to retrieve crew-gate assignments")
                }

                type crewGateAssignment struct {
                        ID         string    `json:"id"`
                        UserID     string    `json:"userId"`
                        UserName   string    `json:"userName"`
                        UserEmail  string    `json:"userEmail"`
                        GateID     string    `json:"gateId"`
                        GateName   string    `json:"gateName"`
                        GateType   string    `json:"gateType"`
                        Shift      *string   `json:"shift"`
                        Status     string    `json:"status"`
                        AssignedAt time.Time `json:"assignedAt"`
                }

                result := make([]crewGateAssignment, len(gateStaff))
                for i, gs := range gateStaff {
                        cga := crewGateAssignment{
                                ID:         gs.ID,
                                UserID:     gs.UserID,
                                GateID:     gs.GateID,
                                Shift:      gs.Shift,
                                Status:     gs.Status,
                                AssignedAt: gs.AssignedAt,
                        }
                        if gs.User.ID != "" {
                                cga.UserName = gs.User.Name
                                cga.UserEmail = gs.User.Email
                        }
                        if gs.Gate.ID != "" {
                                cga.GateName = gs.Gate.Name
                                cga.GateType = gs.Gate.Type
                        }
                        result[i] = cga
                }

                return response.Paginated(c, result, total, page, perPage)
        }
}

// GetAdminLiveMonitor handles GET /api/v1/admin/live-monitor
// Admin-specific live monitoring with combined dashboard + live stats.
func GetAdminLiveMonitor(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                eventID := c.Query("eventId")

                statsService := services.NewStatsService(db)

                // If an eventID is provided, return event-specific stats
                if eventID != "" {
                        dashboardStats, err := statsService.GetDashboardStats(eventID)
                        if err != nil {
                                return response.InternalError(c, "Failed to retrieve live monitoring data")
                        }
                        return response.OK(c, dashboardStats)
                }

                // No eventID: return global admin stats
                var totalUsers, totalOrders, totalEvents, totalTickets int64
                var totalRevenue int64

                db.Model(&models.User{}).Count(&totalUsers)
                db.Model(&models.Order{}).Count(&totalOrders)
                db.Model(&models.Event{}).Count(&totalEvents)
                db.Model(&models.Ticket{}).Count(&totalTickets)
                db.Model(&models.Order{}).Where("status = ?", "paid").
                        Select("COALESCE(SUM(total_amount), 0)").Scan(&totalRevenue)

                // Active SSE connections
                var sseClientCount int
                if services.Hub != nil {
                        sseClientCount = services.Hub.ClientCount()
                }

                // Per-event live summaries (top 5 events by order count)
                type eventSummary struct {
                        EventID      string `json:"eventId"`
                        EventTitle   string `json:"eventTitle"`
                        OrderCount   int64  `json:"orderCount"`
                        PaidOrders   int64  `json:"paidOrders"`
                        TicketsSold  int64  `json:"ticketsSold"`
                        Revenue      int64  `json:"revenue"`
                }
                var summaries []eventSummary
                db.Model(&models.Event{}).
                        Select("events.id as event_id, events.title as event_title").
                        Limit(5).
                        Find(&summaries)

                for i, s := range summaries {
                        db.Model(&models.Order{}).Where("event_id = ?", s.EventID).Count(&summaries[i].OrderCount)
                        db.Model(&models.Order{}).Where("event_id = ? AND status = ?", s.EventID, "paid").Count(&summaries[i].PaidOrders)
                        db.Model(&models.Ticket{}).
                                Joins("JOIN orders ON orders.id = tickets.order_id").
                                Where("orders.event_id = ? AND orders.status = ?", s.EventID, "paid").
                                Count(&summaries[i].TicketsSold)
                        db.Model(&models.Order{}).Where("event_id = ? AND status = ?", s.EventID, "paid").
                                Select("COALESCE(SUM(total_amount), 0)").Scan(&summaries[i].Revenue)
                }

                return response.OK(c, fiber.Map{
                        "global": fiber.Map{
                                "totalUsers":    totalUsers,
                                "totalOrders":   totalOrders,
                                "totalEvents":   totalEvents,
                                "totalTickets":  totalTickets,
                                "totalRevenue":  totalRevenue,
                                "sseConnections": sseClientCount,
                        },
                        "events": summaries,
                })
        }
}

// ─── TICKET MANAGEMENT ENDPOINTS ────────────────────────────────────────────

// CancelTicket handles PATCH /api/v1/admin/tickets/:ticketId/cancel
func CancelTicket(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                ticketID := c.Params("ticketId")
                if ticketID == "" {
                        return response.BadRequest(c, "Ticket ID is required")
                }

                adminID, _ := c.Locals("userID").(string)

                // Find the ticket
                var ticket models.Ticket
                if err := db.Where("id = ?", ticketID).First(&ticket).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Ticket not found")
                        }
                        return response.InternalError(c, "Failed to retrieve ticket")
                }

                if ticket.Status == "cancelled" {
                        return response.BadRequest(c, "Ticket is already cancelled")
                }

                // Update ticket status
                if err := db.Model(&ticket).Update("status", "cancelled").Error; err != nil {
                        return response.InternalError(c, "Failed to cancel ticket")
                }

                // Log the cancellation via audit log
                auditLog := models.AuditLog{
                        TenantID: ticket.TenantID,
                        UserID:   adminID,
                        Action:   "CANCEL_TICKET",
                        Module:   "admin",
                        Details:  func() *string { s := fmt.Sprintf("Cancelled ticket %s (code: %s)", ticketID, ticket.TicketCode); return &s }(),
                }
                db.Create(&auditLog)

                // Broadcast SSE event
                if services.Hub != nil {
                        services.Hub.Broadcast("ticket_cancelled", fiber.Map{
                                "ticketId":   ticketID,
                                "ticketCode": ticket.TicketCode,
                                "cancelledBy": adminID,
                        })
                }

                // Create notification for the ticket owner
                if ticket.OrderID != "" {
                        var order models.Order
                        if db.Where("id = ?", ticket.OrderID).First(&order).Error == nil {
                                notifService := services.NewNotificationService(db)
                                notifService.CreateNotificationWithCategory(
                                        order.UserID,
                                        order.EventID,
                                        "warning",
                                        "order",
                                        "Ticket Cancelled",
                                        fmt.Sprintf("Your ticket (%s) has been cancelled by an administrator.", ticket.TicketCode),
                                        fiber.Map{"ticketId": ticketID, "orderCode": order.OrderCode},
                                )
                        }
                }

                return response.Success(c, "Ticket cancelled successfully", fiber.Map{
                        "ticketId": ticketID,
                        "status":   "cancelled",
                })
        }
}

// ExpirePendingTickets handles POST /api/v1/admin/tickets/expire-pending
// Find all tickets associated with orders that have expired and set them to "expired".
func ExpirePendingTickets(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                now := time.Now()

                // Find orders that are expired (expiresAt < now AND status = "pending")
                var expiredOrderIDs []string
                db.Model(&models.Order{}).
                        Where("expires_at < ? AND status = ?", now, "pending").
                        Pluck("id", &expiredOrderIDs)

                if len(expiredOrderIDs) == 0 {
                        return response.OK(c, fiber.Map{
                                "expiredCount": 0,
                                "message":      "No expired pending tickets found",
                        })
                }

                // Update tickets belonging to those orders that are still "active"
                result := db.Model(&models.Ticket{}).
                        Where("order_id IN ? AND status = ?", expiredOrderIDs, "active").
                        Update("status", "expired")

                if result.Error != nil {
                        return response.InternalError(c, "Failed to expire pending tickets")
                }

                // Also update the orders themselves to "expired"
                db.Model(&models.Order{}).
                        Where("id IN ?", expiredOrderIDs).
                        Update("status", "expired")

                // Broadcast SSE event
                if services.Hub != nil {
                        services.Hub.Broadcast("tickets_expired", fiber.Map{
                                "count":       result.RowsAffected,
                                "orderCount":  len(expiredOrderIDs),
                        })
                }

                // Log the action
                adminID, _ := c.Locals("userID").(string)
                details := fmt.Sprintf("Expired %d tickets across %d orders", result.RowsAffected, len(expiredOrderIDs))
                auditLog := models.AuditLog{
                        TenantID: "",
                        UserID:   adminID,
                        Action:   "EXPIRE_PENDING_TICKETS",
                        Module:   "admin",
                        Details:  &details,
                }
                // Derive TenantID from an expired order if available
                if len(expiredOrderIDs) > 0 {
                        var firstOrder models.Order
                        if db.Where("id = ?", expiredOrderIDs[0]).First(&firstOrder).Error == nil {
                                auditLog.TenantID = firstOrder.TenantID
                        }
                }
                db.Create(&auditLog)

                return response.OK(c, fiber.Map{
                        "expiredCount": result.RowsAffected,
                        "orderCount":   len(expiredOrderIDs),
                        "message":      fmt.Sprintf("Successfully expired %d tickets", result.RowsAffected),
                })
        }
}

// ─── USER ROLE MANAGEMENT ──────────────────────────────────────────────────

// UpdateUserRole handles PATCH /api/v1/admin/users/:userId/role
// Allows SUPER_ADMIN to change any user's role (except other SUPER_ADMINs).
func UpdateUserRole(db *gorm.DB) fiber.Handler {
        validRoles := map[string]bool{
                "SUPER_ADMIN":    true,
                "ORGANIZER":      true,
                "COUNTER_STAFF":  true,
                "GATE_STAFF":     true,
                "PARTICIPANT":    true,
        }

        return func(c fiber.Ctx) error {
                userID := c.Params("userId")
                if userID == "" {
                        return response.BadRequest(c, "User ID is required")
                }

                // Parse request body
                type roleRequest struct {
                        Role string `json:"role"`
                }
                var req roleRequest
                if err := c.Bind().JSON(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                // Validate role
                if !validRoles[req.Role] {
                        return response.BadRequest(c, "Invalid role. Must be one of: SUPER_ADMIN, ORGANIZER, COUNTER_STAFF, GATE_STAFF, PARTICIPANT")
                }

                // Find target user
                var user models.User
                if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "User not found")
                        }
                        return response.InternalError(c, "Failed to retrieve user")
                }

                // Prevent changing another SUPER_ADMIN's role (only SUPER_ADMIN can change roles,
                // and they shouldn't be able to demote other SUPER_ADMINs)
                adminRole, _ := c.Locals("userRole").(string)
                if user.Role == "SUPER_ADMIN" && adminRole == "SUPER_ADMIN" && user.ID != c.Locals("userID").(string) {
                        return response.BadRequest(c, "Cannot change another SUPER_ADMIN's role")
                }

                // Update role
                oldRole := user.Role
                if err := db.Model(&user).Update("role", req.Role).Error; err != nil {
                        return response.InternalError(c, "Failed to update user role")
                }

                // Log the role change
                adminID, _ := c.Locals("userID").(string)
                auditLog := models.AuditLog{
                        UserID:  adminID,
                        Action:  "UPDATE_USER_ROLE",
                        Module:  "admin",
                        Details: func() *string { s := fmt.Sprintf("Changed user %s (%s) role from %s to %s", user.Name, user.Email, oldRole, req.Role); return &s }(),
                }
                db.Create(&auditLog)

                // Reload user to get updated data
                db.Where("id = ?", userID).First(&user)

                return response.OK(c, fiber.Map{
                        "user":     user,
                        "oldRole":  oldRole,
                        "newRole":  req.Role,
                        "message":  fmt.Sprintf("User role updated from %s to %s. User must re-login for changes to take effect.", oldRole, req.Role),
                })
        }
}
