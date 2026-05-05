package routes

import (
        "github.com/bukdanaws-commits/seleevent/backend/internal/handlers"
        "github.com/bukdanaws-commits/seleevent/backend/internal/middleware"
        "github.com/bukdanaws-commits/seleevent/backend/internal/services"
        "github.com/gofiber/fiber/v2"
        "github.com/gofiber/fiber/v2/middleware/cors"
        "gorm.io/gorm"
)

// Setup configures all application routes
func Setup(app *fiber.App, db *gorm.DB, hub *services.SSEHub) {
        // Initialize validator
        middleware.InitValidator()

        // Global middleware - CORS
        // Note: AllowAllOrigins cannot be used with AllowCredentials, so we use AllowOriginsFunc
        app.Use(cors.New(cors.Config{
                AllowOriginsFunc: func(origin string) bool { return true },
                AllowMethods:     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
                AllowHeaders:     "Origin,Content-Type,Accept,Authorization",
                AllowCredentials: true,
        }))

        // Health check
        app.Get("/health", func(c *fiber.Ctx) error {
                return c.JSON(fiber.Map{"status": "ok", "service": "seleevent-api"})
        })

        // API v1 group
        api := app.Group("/api/v1")

        // === PUBLIC ROUTES (no auth required) ===
        public := api.Group("")
        public.Post("/auth/google", handlers.GoogleLogin(db))
        public.Post("/auth/refresh", handlers.RefreshToken(db))
        public.Post("/tickets/check", handlers.CheckTicket(db))

        // Public event info
        public.Get("/events/:slug", handlers.GetEventBySlug(db))
        public.Get("/events/:eventId/ticket-types", handlers.GetEventTicketTypes(db))

        // Public - Midtrans payment callback (called by Midtrans servers, NO AUTH)
        public.Post("/payment/callback", handlers.PaymentCallback(db))
        public.Post("/payment/notification", handlers.PaymentNotification(db))

        // SSE (Server-Sent Events) - real-time (supports ?token= query param for EventSource)
        // Placed outside auth group because EventSource API cannot send custom headers;
        // JWTAuthSSE reads token from Authorization header OR ?token= query param.
        api.Get("/events/stream", middleware.JWTAuthSSE(), handlers.SSEStream(db, hub))

        // === AUTHENTICATED ROUTES ===
        auth := api.Group("", middleware.JWTAuth())

        // Auth (authenticated)
        auth.Post("/auth/logout", handlers.Logout(db))
        auth.Get("/auth/me", handlers.GetMe(db))

        // === ORDER ROUTES ===
        orders := auth.Group("/orders")
        orders.Post("/", handlers.CreateOrder(db))
        orders.Get("/", handlers.GetUserOrders(db))
        orders.Get("/:orderId", handlers.GetOrderDetail(db))
        orders.Post("/:orderId/cancel", handlers.CancelOrder(db))

        // === PAYMENT ROUTES ===
        payment := auth.Group("/payment")
        payment.Post("/create", handlers.CreatePayment(db))
        payment.Post("/create-direct", handlers.CreateDirectPayment(db))
        payment.Get("/status/:orderId", handlers.GetPaymentStatus(db))

        // === GATE STAFF ROUTES ===
        gate := auth.Group("/gate", middleware.RoleRequired("GATE_STAFF"))
        gate.Post("/scan", handlers.GateScan(db))
        gate.Get("/logs", handlers.GetGateLogs(db))
        gate.Get("/status", handlers.GetGateStatus(db))
        gate.Get("/profile", handlers.GetGateProfile(db))

        // === COUNTER STAFF ROUTES ===
        counter := auth.Group("/counter", middleware.RoleRequired("COUNTER_STAFF"))
        counter.Post("/scan", handlers.CounterScan(db))
        counter.Get("/redemptions", handlers.GetCounterRedemptions(db))
        counter.Get("/status", handlers.GetCounterStatus(db))
        counter.Get("/inventory", handlers.GetCounterInventory(db))
        counter.Get("/guide", handlers.GetCounterGuide(db))

        // === ORGANIZER ROUTES ===
        organizer := auth.Group("/organizer", middleware.RoleRequired("ORGANIZER", "ADMIN", "SUPER_ADMIN"))
        organizer.Get("/dashboard/stats", handlers.GetOrganizerDashboardStats(db))
        organizer.Get("/live-monitor", handlers.GetOrganizerLiveMonitor(db))
        organizer.Get("/redemptions", handlers.GetOrganizerRedemptions(db))
        organizer.Get("/counters", handlers.GetOrganizerCounters(db))
        organizer.Get("/gates", handlers.GetOrganizerGates(db))
        organizer.Get("/tickets", handlers.GetOrganizerTickets(db))
        organizer.Get("/staff", handlers.GetOrganizerStaff(db))
        organizer.Get("/wristband-inventory", handlers.GetOrganizerWristbandInventory(db))
        organizer.Get("/wristband-guide", handlers.GetOrganizerWristbandGuide(db))

        // === ADMIN ROUTES ===
        admin := auth.Group("/admin", middleware.RoleRequired("ADMIN", "SUPER_ADMIN"))
        admin.Get("/dashboard", handlers.GetAdminDashboard(db))
        admin.Get("/orders", handlers.GetAdminOrders(db))
        admin.Get("/users", handlers.GetAdminUsers(db))
        admin.Get("/events", handlers.GetAdminEvents(db))
        admin.Get("/analytics", handlers.GetAdminAnalytics(db))

        // Admin extended routes
        admin.Get("/tickets", handlers.GetAdminTickets(db))
        admin.Get("/staff", handlers.GetAdminStaff(db))
        admin.Get("/counters", handlers.GetAdminCounters(db))
        admin.Get("/gates", handlers.GetAdminGates(db))
        admin.Get("/gate-monitoring", handlers.GetAdminGateMonitoring(db))
        admin.Get("/verifications", handlers.GetAdminVerifications(db))
        admin.Get("/seats", handlers.GetAdminSeats(db))
        admin.Get("/settings", handlers.GetAdminSettings(db))
        admin.Get("/crew-gates", handlers.GetAdminCrewGates(db))
        admin.Get("/live-monitor", handlers.GetAdminLiveMonitor(db))
        admin.Patch("/tickets/:ticketId/cancel", handlers.CancelTicket(db))
        admin.Post("/tickets/expire-pending", handlers.ExpirePendingTickets(db))

        // === NOTIFICATION ROUTES ===
        notifs := auth.Group("/notifications")
        notifs.Get("/", handlers.GetNotifications(db))
        notifs.Patch("/:id/read", handlers.MarkNotificationRead(db))
        notifs.Post("/read-all", handlers.MarkAllNotificationsRead(db))

        // === 404 Handler ===
        app.Use(func(c *fiber.Ctx) error {
                return c.Status(404).JSON(fiber.Map{
                        "success": false,
                        "error":   "Endpoint not found",
                })
        })
}
