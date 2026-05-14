package routes

import (
        "github.com/bukdanaws-commits/seleevent/backend/internal/handlers"
        "github.com/bukdanaws-commits/seleevent/backend/internal/middleware"
        "github.com/bukdanaws-commits/seleevent/backend/internal/services"
        "github.com/gofiber/fiber/v3"
        "github.com/gofiber/fiber/v3/middleware/cors"
        "gorm.io/gorm"
)

// Setup configures all application routes
func Setup(app *fiber.App, db *gorm.DB, hub *services.SSEHub) {
        // Initialize validator
        middleware.InitValidator()

        // Initialize SettingsService and seed defaults
        settingsService := services.NewSettingsService(db)
        settingsService.SeedDefaults()
        services.DefaultSettingsService = settingsService

        // Initialize SettingsHandler
        settingsHandler := handlers.NewSettingsHandler(settingsService)

        // Global middleware - CORS
        // Note: AllowAllOrigins cannot be used with AllowCredentials, so we use AllowOriginsFunc
        app.Use(cors.New(cors.Config{
                AllowOriginsFunc: func(origin string) bool { return true },
                AllowMethods: []string{
                        "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
                },
                AllowHeaders: []string{
                        "Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With",
                },
                AllowCredentials: true,
		ExposeHeaders:    []string{"Content-Length"},
		MaxAge:           86400,
        }))

        // Health check
        app.Get("/health", func(c fiber.Ctx) error {
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

        // DOKU payment callback/notification endpoints
        public.Post("/doku/notification", handlers.DokuNotification(db))

        // Public - Coupon validation (for checkout flow, no auth required)
        public.Post("/coupons/validate", handlers.ValidateCoupon(db))

        // Public - Fee configuration (for checkout page)
        settingsPublic := public.Group("/settings")
        settingsPublic.Get("/fee-config", settingsHandler.GetPublicFeeConfig)

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

        // DOKU payment routes
        dokuPayment := auth.Group("/doku")
        dokuPayment.Post("/create", handlers.DokuCreatePayment(db))
        dokuPayment.Get("/status/:orderId", handlers.DokuCheckPayment(db))

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
        // Dashboard & monitoring
        organizer.Get("/dashboard/stats", handlers.GetOrganizerDashboardStats(db))
        organizer.Get("/live-monitor", handlers.GetOrganizerLiveMonitor(db))
        organizer.Get("/redemptions", handlers.GetOrganizerRedemptions(db))
        organizer.Get("/counters", handlers.GetOrganizerCounters(db))
        organizer.Get("/gates", handlers.GetOrganizerGates(db))
        organizer.Get("/tickets", handlers.GetOrganizerTickets(db))
        organizer.Get("/staff", handlers.GetOrganizerStaff(db))
        organizer.Get("/wristband-inventory", handlers.GetOrganizerWristbandInventory(db))
        organizer.Get("/wristband-guide", handlers.GetOrganizerWristbandGuide(db))

        // Organizer event CRUD (matching FE api.ts: /organizer/event)
        organizer.Get("/event", handlers.GetOrganizerEvent(db))
        organizer.Post("/event", handlers.CreateOrganizerEvent(db))
        organizer.Patch("/event/:id", handlers.UpdateOrganizerEvent(db))
        organizer.Delete("/event/:id", handlers.DeleteOrganizerEvent(db))

        // Organizer ticket types (matching FE api.ts: /organizer/ticket-types)
        organizer.Get("/ticket-types", handlers.GetOrganizerTicketTypes(db))
        organizer.Post("/ticket-types", handlers.CreateOrganizerTicketType(db))
        organizer.Put("/ticket-types/:ticketTypeId", handlers.UpdateOrganizerTicketType(db))
        organizer.Delete("/ticket-types/:ticketTypeId", handlers.DeleteOrganizerTicketType(db))

        // Organizer orders
        organizer.Get("/orders", handlers.GetOrganizerOrders(db))

        // Organizer finance (matching FE api.ts: /organizer/finance)
        organizer.Get("/finance", handlers.GetOrganizerFinance(db))
        organizer.Get("/balance", handlers.GetOrganizerBalance(db))

        // Organizer bank accounts
        organizer.Get("/bank-accounts", handlers.GetOrganizerBankAccounts(db))
        organizer.Post("/bank-accounts", handlers.CreateOrganizerBankAccount(db))
        organizer.Put("/bank-accounts/:id", handlers.UpdateOrganizerBankAccount(db))
        organizer.Delete("/bank-accounts/:id", handlers.DeleteOrganizerBankAccount(db))

        // Organizer withdrawals
        organizer.Post("/withdraw", handlers.CreateWithdrawal(db))
        organizer.Get("/withdrawals", handlers.GetOrganizerWithdrawals(db))

        // Organizer payment logs
        organizer.Get("/payment-logs", handlers.GetOrganizerPaymentLogs(db))

        // Organizer refunds (matching FE api.ts: /organizer/refunds)
        organizer.Get("/refunds", handlers.GetOrganizerRefunds(db))
        organizer.Post("/refunds", handlers.CreateOrganizerRefund(db))

        // === ADMIN ROUTES ===
        admin := auth.Group("/admin", middleware.RoleRequired("ADMIN", "SUPER_ADMIN"))
        // Core admin
        admin.Get("/dashboard", handlers.GetAdminDashboard(db))
        admin.Get("/orders", handlers.GetAdminOrders(db))
        admin.Get("/users", handlers.GetAdminUsers(db))
        admin.Patch("/users/:userId/role", handlers.UpdateUserRole(db))
        admin.Get("/events", handlers.GetAdminEvents(db))
        admin.Get("/analytics", handlers.GetAdminAnalytics(db))

        // Admin extended routes (existing)
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

        // Admin ticket types management
        admin.Get("/ticket-types", handlers.GetAdminTicketTypes(db))
        admin.Put("/ticket-types/:ticketTypeId", handlers.UpdateAdminTicketType(db))
        admin.Delete("/ticket-types/:ticketTypeId", handlers.DeleteAdminTicketType(db))

        // Admin organizers management
        admin.Get("/organizers", handlers.GetAdminOrganizers(db))
        admin.Patch("/organizers/:id/approve", handlers.ApproveOrganizer(db))
        admin.Patch("/organizers/:id/reject", handlers.RejectOrganizer(db))
        admin.Get("/organizers/:id/fee", handlers.GetOrganizerFee(db))
        admin.Patch("/organizers/:id/fee", handlers.SetOrganizerFee(db))
        admin.Patch("/organizers/:id/fee/approve", handlers.ApproveOrganizerFee(db))

        // Admin withdrawals management
        admin.Get("/withdrawals", handlers.GetAdminWithdrawals(db))
        admin.Patch("/withdrawals/:id/approve", handlers.ApproveWithdrawal(db))
        admin.Patch("/withdrawals/:id/reject", handlers.RejectWithdrawal(db))
        admin.Post("/withdrawals/:id/proof", handlers.UploadTransferProof(db))
        admin.Post("/withdrawals/disburse", handlers.DokuDisburse(db))
        admin.Post("/withdrawals/:id/check-doku", handlers.CheckDokuDisbursement(db))

        // Admin payment logs & refunds
        admin.Get("/payment-logs", handlers.GetAdminPaymentLogs(db))
        admin.Get("/refunds", handlers.GetAdminRefunds(db))
        admin.Patch("/refunds/:id/approve", handlers.ApproveRefund(db))
        admin.Patch("/refunds/:id/reject", handlers.RejectRefund(db))

        // Admin coupons
        admin.Get("/coupons", handlers.GetAdminCoupons(db))
        admin.Post("/coupons", handlers.CreateAdminCoupon(db))
        admin.Put("/coupons/:id", handlers.UpdateAdminCoupon(db))
        admin.Delete("/coupons/:id", handlers.DeleteAdminCoupon(db))

        // Admin settings (fee config, payment config, etc.)
        settingsAdmin := admin.Group("/settings")
        settingsAdmin.Put("/bulk", settingsHandler.BulkUpdateSettings)
        settingsAdmin.Get("/all", settingsHandler.GetAllSettings)
        settingsAdmin.Get("/:category", settingsHandler.GetSettingsByCategory)
        settingsAdmin.Put("/:key", settingsHandler.UpdateSetting)

        // === NOTIFICATION ROUTES ===
        notifs := auth.Group("/notifications")
        notifs.Get("/", handlers.GetNotifications(db))
        notifs.Patch("/:id/read", handlers.MarkNotificationRead(db))
        notifs.Post("/read-all", handlers.MarkAllNotificationsRead(db))

        // === 404 Handler ===
        app.Use(func(c fiber.Ctx) error {
                return c.Status(404).JSON(fiber.Map{
                        "success": false,
                        "error":   "Endpoint not found",
                })
        })
}
