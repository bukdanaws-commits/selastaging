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

// getOrganizerIDFromContext extracts the userID from context and looks up the organizerID.
// Returns the organizerID or an error response.
func getOrganizerIDFromContext(c fiber.Ctx, db *gorm.DB) (string, error) {
        userID, _ := c.Locals("userID").(string)
        organizerID, err := services.GetOrganizerByUserID(db, userID)
        if err != nil {
                if err == gorm.ErrRecordNotFound {
                        return "", fiber.NewError(fiber.StatusForbidden, "Organizer profile not found")
                }
                return "", fiber.NewError(fiber.StatusInternalServerError, "Failed to retrieve organizer profile")
        }
        return organizerID, nil
}

// ─── ORGANIZER EVENT CRUD ──────────────────────────────────────────────────

// GetOrganizerEvent handles GET /api/v1/organizer/event
func GetOrganizerEvent(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

                eventID := c.Query("eventId")
                query := db.Model(&models.Event{}).Where("organizer_id = ?", organizerID)

                if eventID != "" {
                        var event models.Event
                        if err := query.Where("id = ?", eventID).
                                Preload("TicketTypes").
                                First(&event).Error; err != nil {
                                if err == gorm.ErrRecordNotFound {
                                        return response.NotFound(c, "Event not found")
                                }
                                return response.InternalError(c, "Failed to retrieve event")
                        }
                        return response.OK(c, event)
                }

                var events []models.Event
                if err := query.Preload("TicketTypes").Order("created_at DESC").Find(&events).Error; err != nil {
                        return response.InternalError(c, "Failed to retrieve events")
                }
                return response.OK(c, events)
        }
}

// CreateOrganizerEvent handles POST /api/v1/organizer/event
func CreateOrganizerEvent(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

                type createEventReq struct {
                        TenantID string  `json:"tenantId"`
                        Slug     string  `json:"slug"`
                        Title    string  `json:"title"`
                        Subtitle *string `json:"subtitle,omitempty"`
                        Date     string  `json:"date"`
                        Venue    string  `json:"venue"`
                        City     string  `json:"city"`
                        Address  *string `json:"address,omitempty"`
                        Capacity int     `json:"capacity"`
                }

                var req createEventReq
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                if req.Title == "" || req.Slug == "" || req.Date == "" || req.Venue == "" || req.City == "" {
                        return response.BadRequest(c, "title, slug, date, venue, and city are required")
                }

                eventDate, err := time.Parse(time.RFC3339, req.Date)
                if err != nil {
                        return response.BadRequest(c, "Invalid date format, use RFC3339")
                }

                tenantID := req.TenantID
                if tenantID == "" {
                        var tenant models.Tenant
                        if db.First(&tenant).Error == nil {
                                tenantID = tenant.ID
                        }
                }

                event := models.Event{
                        TenantID:    tenantID,
                        OrganizerID: &organizerID,
                        Slug:        req.Slug,
                        Title:       req.Title,
                        Subtitle:    req.Subtitle,
                        Date:        eventDate,
                        Venue:       req.Venue,
                        City:        req.City,
                        Address:     req.Address,
                        Capacity:    req.Capacity,
                        Status:      "draft",
                }

                if err := db.Create(&event).Error; err != nil {
                        return response.InternalError(c, "Failed to create event")
                }

                return response.Created(c, "Event created successfully", event)
        }
}

// UpdateOrganizerEvent handles PATCH /api/v1/organizer/event/:id
func UpdateOrganizerEvent(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

                eventID := c.Params("id")
                if eventID == "" {
                        return response.BadRequest(c, "Event ID is required")
                }

                var event models.Event
                if err := db.Where("id = ? AND organizer_id = ?", eventID, organizerID).First(&event).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Event not found")
                        }
                        return response.InternalError(c, "Failed to retrieve event")
                }

                type updateEventReq struct {
                        Slug     *string `json:"slug"`
                        Title    *string `json:"title"`
                        Subtitle *string `json:"subtitle"`
                        Date     *string `json:"date"`
                        Venue    *string `json:"venue"`
                        City     *string `json:"city"`
                        Address  *string `json:"address"`
                        Capacity *int    `json:"capacity"`
                        Status   *string `json:"status"`
                }

                var req updateEventReq
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                updates := map[string]any{}
                if req.Slug != nil {
                        updates["slug"] = *req.Slug
                }
                if req.Title != nil {
                        updates["title"] = *req.Title
                }
                if req.Subtitle != nil {
                        updates["subtitle"] = req.Subtitle
                }
                if req.Date != nil {
                        parsedDate, err := time.Parse(time.RFC3339, *req.Date)
                        if err != nil {
                                return response.BadRequest(c, "Invalid date format")
                        }
                        updates["date"] = parsedDate
                }
                if req.Venue != nil {
                        updates["venue"] = *req.Venue
                }
                if req.City != nil {
                        updates["city"] = *req.City
                }
                if req.Address != nil {
                        updates["address"] = req.Address
                }
                if req.Capacity != nil {
                        updates["capacity"] = *req.Capacity
                }
                if req.Status != nil {
                        updates["status"] = *req.Status
                }

                if len(updates) == 0 {
                        return response.BadRequest(c, "No fields to update")
                }

                if err := db.Model(&event).Updates(updates).Error; err != nil {
                        return response.InternalError(c, "Failed to update event")
                }

                db.Where("id = ?", eventID).Preload("TicketTypes").First(&event)
                return response.OK(c, event)
        }
}

// DeleteOrganizerEvent handles DELETE /api/v1/organizer/event/:id
func DeleteOrganizerEvent(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

                eventID := c.Params("id")
                if eventID == "" {
                        return response.BadRequest(c, "Event ID is required")
                }

                var event models.Event
                if err := db.Where("id = ? AND organizer_id = ?", eventID, organizerID).First(&event).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Event not found")
                        }
                        return response.InternalError(c, "Failed to retrieve event")
                }

                if err := db.Delete(&event).Error; err != nil {
                        return response.InternalError(c, "Failed to delete event")
                }

                return response.Success(c, "Event deleted successfully", nil)
        }
}

// ─── ORGANIZER TICKET TYPES ────────────────────────────────────────────────

// GetOrganizerTicketTypes handles GET /api/v1/organizer/ticket-types
func GetOrganizerTicketTypes(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

                eventID := c.Query("eventId")

                query := db.Model(&models.TicketType{}).
                        Joins("JOIN events ON events.id = ticket_types.event_id").
                        Where("events.organizer_id = ?", organizerID)

                if eventID != "" {
                        query = query.Where("ticket_types.event_id = ?", eventID)
                }

                var ticketTypes []models.TicketType
                if err := query.Order("ticket_types.created_at DESC").Find(&ticketTypes).Error; err != nil {
                        return response.InternalError(c, "Failed to retrieve ticket types")
                }

                return response.OK(c, ticketTypes)
        }
}

// CreateOrganizerTicketType handles POST /api/v1/organizer/ticket-types
func CreateOrganizerTicketType(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

                type createTicketTypeReq struct {
                        TenantID    string  `json:"tenantId"`
                        EventID     string  `json:"eventId"`
                        Name        string  `json:"name"`
                        Description *string `json:"description,omitempty"`
                        Price       int     `json:"price"`
                        Quota       int     `json:"quota"`
                        Tier        string  `json:"tier"`
                        Zone        *string `json:"zone,omitempty"`
                        Emoji       *string `json:"emoji,omitempty"`
                        Benefits    models.StringArray `json:"benefits,omitempty"`
                        PlatformFee float64 `json:"platformFee"`
                }

                var req createTicketTypeReq
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                if req.EventID == "" || req.Name == "" || req.Price < 0 || req.Quota <= 0 {
                        return response.BadRequest(c, "eventId, name, price, and quota are required")
                }

                var event models.Event
                if err := db.Where("id = ? AND organizer_id = ?", req.EventID, organizerID).First(&event).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Event not found or not owned by this organizer")
                        }
                        return response.InternalError(c, "Failed to verify event ownership")
                }

                tenantID := req.TenantID
                if tenantID == "" {
                        tenantID = event.TenantID
                }

                tier := req.Tier
                if tier == "" {
                        tier = "floor"
                }

                ticketType := models.TicketType{
                        TenantID:    tenantID,
                        EventID:     req.EventID,
                        Name:        req.Name,
                        Description: req.Description,
                        Price:       req.Price,
                        Quota:       req.Quota,
                        Tier:        tier,
                        Zone:        req.Zone,
                        Emoji:       req.Emoji,
                        Benefits:    req.Benefits,
                        PlatformFee: req.PlatformFee,
                }

                if err := db.Create(&ticketType).Error; err != nil {
                        return response.InternalError(c, "Failed to create ticket type")
                }

                return response.Created(c, "Ticket type created successfully", ticketType)
        }
}

// UpdateOrganizerTicketType handles PUT /api/v1/organizer/ticket-types/:ticketTypeId
func UpdateOrganizerTicketType(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

                ticketTypeID := c.Params("ticketTypeId")
                if ticketTypeID == "" {
                        return response.BadRequest(c, "Ticket Type ID is required")
                }

                var ticketType models.TicketType
                if err := db.Joins("JOIN events ON events.id = ticket_types.event_id").
                        Where("ticket_types.id = ? AND events.organizer_id = ?", ticketTypeID, organizerID).
                        First(&ticketType).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Ticket type not found")
                        }
                        return response.InternalError(c, "Failed to retrieve ticket type")
                }

                type updateReq struct {
                        Name        *string  `json:"name"`
                        Description *string  `json:"description"`
                        Price       *int     `json:"price"`
                        Quota       *int     `json:"quota"`
                        Tier        *string  `json:"tier"`
                        Zone        *string  `json:"zone"`
                        Emoji       *string  `json:"emoji"`
                        Benefits    models.StringArray `json:"benefits"`
                        PlatformFee *float64 `json:"platformFee"`
                        Status      *string  `json:"status"`
                }

                var req updateReq
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                updates := map[string]any{}
                if req.Name != nil {
                        updates["name"] = *req.Name
                }
                if req.Description != nil {
                        updates["description"] = req.Description
                }
                if req.Price != nil {
                        updates["price"] = *req.Price
                }
                if req.Quota != nil {
                        updates["quota"] = *req.Quota
                }
                if req.Tier != nil {
                        updates["tier"] = *req.Tier
                }
                if req.Zone != nil {
                        updates["zone"] = req.Zone
                }
                if req.Emoji != nil {
                        updates["emoji"] = req.Emoji
                }
                updates["benefits"] = req.Benefits
                if req.PlatformFee != nil {
                        updates["platform_fee"] = *req.PlatformFee
                }
                if req.Status != nil {
                        updates["status"] = *req.Status
                }

                if len(updates) == 0 {
                        return response.BadRequest(c, "No fields to update")
                }

                if err := db.Model(&ticketType).Updates(updates).Error; err != nil {
                        return response.InternalError(c, "Failed to update ticket type")
                }

                db.Where("id = ?", ticketTypeID).First(&ticketType)
                return response.OK(c, ticketType)
        }
}

// DeleteOrganizerTicketType handles DELETE /api/v1/organizer/ticket-types/:ticketTypeId
func DeleteOrganizerTicketType(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

                ticketTypeID := c.Params("ticketTypeId")
                if ticketTypeID == "" {
                        return response.BadRequest(c, "Ticket Type ID is required")
                }

                var ticketType models.TicketType
                if err := db.Joins("JOIN events ON events.id = ticket_types.event_id").
                        Where("ticket_types.id = ? AND events.organizer_id = ?", ticketTypeID, organizerID).
                        First(&ticketType).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Ticket type not found")
                        }
                        return response.InternalError(c, "Failed to retrieve ticket type")
                }

                if err := db.Delete(&ticketType).Error; err != nil {
                        return response.InternalError(c, "Failed to delete ticket type")
                }

                return response.Success(c, "Ticket type deleted successfully", nil)
        }
}

// ─── ORGANIZER ORDERS ─────────────────────────────────────────────────────

// GetOrganizerOrders handles GET /api/v1/organizer/orders
func GetOrganizerOrders(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

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

                var eventIDs []string
                eventQuery := db.Model(&models.Event{}).Where("organizer_id = ?", organizerID)
                if eventID != "" {
                        eventQuery = eventQuery.Where("id = ?", eventID)
                }
                eventQuery.Pluck("id", &eventIDs)

                if len(eventIDs) == 0 {
                        return response.Paginated(c, []models.Order{}, 0, page, perPage)
                }

                var orders []models.Order
                var total int64

                query := db.Model(&models.Order{}).Where("event_id IN ?", eventIDs)
                if status != "" {
                        query = query.Where("status = ?", status)
                }

                query.Count(&total)
                err = query.
                        Preload("User").
                        Preload("Event").
                        Preload("Items").
                        Preload("Items.TicketType").
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

// ─── ORGANIZER FINANCE ────────────────────────────────────────────────────

// GetOrganizerFinance handles GET /api/v1/organizer/finance
func GetOrganizerFinance(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

                eventID := c.Query("eventId")
                summary, err := services.GetOrganizerFinance(db, organizerID, eventID)
                if err != nil {
                        return response.InternalError(c, "Failed to calculate finance summary")
                }

                return response.OK(c, summary)
        }
}

// GetOrganizerBalance handles GET /api/v1/organizer/balance
func GetOrganizerBalance(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

                eventID := c.Query("eventId")
                summary, err := services.GetOrganizerFinance(db, organizerID, eventID)
                if err != nil {
                        return response.InternalError(c, "Failed to calculate balance")
                }

                return response.OK(c, fiber.Map{
                        "availableBalance": summary.AvailableBalance,
                        "totalRevenue":     summary.TotalRevenue,
                        "platformFees":     summary.PlatformFees,
                        "netBalance":       summary.NetBalance,
                        "pendingWithdrawals": summary.PendingWithdrawals,
                })
        }
}

// ─── ORGANIZER BANK ACCOUNT ───────────────────────────────────────────────

// GetOrganizerBankAccount handles GET /api/v1/organizer/bank-account
func GetOrganizerBankAccount(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

                var bankAccounts []models.OrganizerBankAccount
                if err := db.Where("organizer_id = ?", organizerID).
                        Order("created_at DESC").
                        Find(&bankAccounts).Error; err != nil {
                        return response.InternalError(c, "Failed to retrieve bank accounts")
                }

                return response.OK(c, bankAccounts)
        }
}

// GetOrganizerBankAccounts handles GET /api/v1/organizer/bank-accounts (alias)
func GetOrganizerBankAccounts(db *gorm.DB) fiber.Handler {
        return GetOrganizerBankAccount(db)
}

// SaveOrganizerBankAccount handles POST /api/v1/organizer/bank-account
func SaveOrganizerBankAccount(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

                type saveBankAccountReq struct {
                        BankName      string `json:"bankName"`
                        AccountNumber string `json:"accountNumber"`
                        AccountHolder string `json:"accountHolder"`
                        IsVerified    bool   `json:"isVerified"`
                }

                var req saveBankAccountReq
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                if req.BankName == "" || req.AccountNumber == "" || req.AccountHolder == "" {
                        return response.BadRequest(c, "bankName, accountNumber, and accountHolder are required")
                }

                bankAccount := models.OrganizerBankAccount{
                        OrganizerID:   organizerID,
                        BankName:      req.BankName,
                        AccountNumber: req.AccountNumber,
                        AccountHolder: req.AccountHolder,
                        IsVerified:    req.IsVerified,
                        Status:        "active",
                }

                if err := db.Create(&bankAccount).Error; err != nil {
                        return response.InternalError(c, "Failed to save bank account")
                }

                return response.Created(c, "Bank account saved successfully", bankAccount)
        }
}

// CreateOrganizerBankAccount handles POST /api/v1/organizer/bank-accounts (alias)
func CreateOrganizerBankAccount(db *gorm.DB) fiber.Handler {
        return SaveOrganizerBankAccount(db)
}

// UpdateOrganizerBankAccount handles PUT /api/v1/organizer/bank-account/:id
func UpdateOrganizerBankAccount(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

                accountID := c.Params("id")
                if accountID == "" {
                        return response.BadRequest(c, "Bank account ID is required")
                }

                var bankAccount models.OrganizerBankAccount
                if err := db.Where("id = ? AND organizer_id = ?", accountID, organizerID).First(&bankAccount).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Bank account not found")
                        }
                        return response.InternalError(c, "Failed to retrieve bank account")
                }

                type updateReq struct {
                        BankName      *string `json:"bankName"`
                        AccountNumber *string `json:"accountNumber"`
                        AccountHolder *string `json:"accountHolder"`
                        IsVerified    *bool   `json:"isVerified"`
                        Status        *string `json:"status"`
                }

                var req updateReq
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                updates := map[string]any{}
                if req.BankName != nil {
                        updates["bank_name"] = *req.BankName
                }
                if req.AccountNumber != nil {
                        updates["account_number"] = *req.AccountNumber
                }
                if req.AccountHolder != nil {
                        updates["account_holder"] = *req.AccountHolder
                }
                if req.IsVerified != nil {
                        updates["is_verified"] = *req.IsVerified
                }
                if req.Status != nil {
                        updates["status"] = *req.Status
                }

                if len(updates) == 0 {
                        return response.BadRequest(c, "No fields to update")
                }

                if err := db.Model(&bankAccount).Updates(updates).Error; err != nil {
                        return response.InternalError(c, "Failed to update bank account")
                }

                db.Where("id = ?", accountID).First(&bankAccount)
                return response.OK(c, bankAccount)
        }
}

// DeleteOrganizerBankAccount handles DELETE /api/v1/organizer/bank-account/:id
func DeleteOrganizerBankAccount(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

                accountID := c.Params("id")
                if accountID == "" {
                        return response.BadRequest(c, "Bank account ID is required")
                }

                var bankAccount models.OrganizerBankAccount
                if err := db.Where("id = ? AND organizer_id = ?", accountID, organizerID).First(&bankAccount).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Bank account not found")
                        }
                        return response.InternalError(c, "Failed to retrieve bank account")
                }

                if err := db.Delete(&bankAccount).Error; err != nil {
                        return response.InternalError(c, "Failed to delete bank account")
                }

                return response.Success(c, "Bank account deleted successfully", nil)
        }
}

// ─── ORGANIZER WITHDRAW ───────────────────────────────────────────────────

// RequestOrganizerWithdrawal handles POST /api/v1/organizer/withdraw
func RequestOrganizerWithdrawal(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

                type withdrawReq struct {
                        Amount        float64 `json:"amount"`
                        BankAccountID string  `json:"bankAccountId"`
                }

                var req withdrawReq
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                if req.Amount <= 0 {
                        return response.BadRequest(c, "Amount must be greater than 0")
                }

                var bankAccount models.OrganizerBankAccount
                if req.BankAccountID != "" {
                        if err := db.Where("id = ? AND organizer_id = ?", req.BankAccountID, organizerID).First(&bankAccount).Error; err != nil {
                                return response.BadRequest(c, "Invalid bank account")
                        }
                } else {
                        if err := db.Where("organizer_id = ?", organizerID).First(&bankAccount).Error; err != nil {
                                return response.BadRequest(c, "No bank account found. Please add a bank account first.")
                        }
                }

                finance, err := services.GetOrganizerFinance(db, organizerID, "")
                if err != nil {
                        return response.InternalError(c, "Failed to calculate balance")
                }

                if int64(req.Amount) > finance.AvailableBalance {
                        return response.BadRequest(c, "Insufficient balance")
                }

                var user models.User
                userID, _ := c.Locals("userID").(string)
                db.Where("id = ?", userID).First(&user)

                var event models.Event
                eventName := ""
                eventCode := ""
                if db.Where("organizer_id = ?", organizerID).First(&event).Error == nil {
                        eventName = event.Title
                        eventCode = event.Slug
                }

                withdrawal := models.WithdrawalRequest{
                        OrganizerID:   organizerID,
                        OrganizerName: user.Name,
                        EventID:       event.ID,
                        EventCode:     eventCode,
                        EventName:     eventName,
                        Amount:        req.Amount,
                        NetAmount:     req.Amount,
                        BankAccountID: bankAccount.ID,
                        BankName:      bankAccount.BankName,
                        AccountNumber: bankAccount.AccountNumber,
                        AccountHolder: bankAccount.AccountHolder,
                        Status:        "pending",
                        Method:        "MANUAL",
                }

                if err := db.Create(&withdrawal).Error; err != nil {
                        return response.InternalError(c, "Failed to create withdrawal request")
                }

                return response.Created(c, "Withdrawal request created successfully", withdrawal)
        }
}

// CreateWithdrawal handles POST /api/v1/organizer/withdraw (alias for compat)
func CreateWithdrawal(db *gorm.DB) fiber.Handler {
        return RequestOrganizerWithdrawal(db)
}

// GetOrganizerWithdrawals handles GET /api/v1/organizer/withdrawals
func GetOrganizerWithdrawals(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

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

                var withdrawals []models.WithdrawalRequest
                var total int64

                query := db.Model(&models.WithdrawalRequest{}).Where("organizer_id = ?", organizerID)
                if status != "" {
                        query = query.Where("status = ?", status)
                }

                query.Count(&total)
                err = query.
                        Order("created_at DESC").
                        Limit(perPage).
                        Offset(offset).
                        Find(&withdrawals).Error

                if err != nil {
                        return response.InternalError(c, "Failed to retrieve withdrawals")
                }

                return response.Paginated(c, withdrawals, total, page, perPage)
        }
}

// ─── ORGANIZER PAYMENT LOGS ───────────────────────────────────────────────

// GetOrganizerPaymentLogs handles GET /api/v1/organizer/payment-logs
func GetOrganizerPaymentLogs(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
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

                var eventIDs []string
                db.Model(&models.Event{}).Where("organizer_id = ?", organizerID).Pluck("id", &eventIDs)

                if len(eventIDs) == 0 {
                        return response.Paginated(c, []models.PaymentLog{}, 0, page, perPage)
                }

                var paymentLogs []models.PaymentLog
                var total int64

                query := db.Model(&models.PaymentLog{}).Where("event_id IN ?", eventIDs)
                query.Count(&total)
                err = query.
                        Order("created_at DESC").
                        Limit(perPage).
                        Offset(offset).
                        Find(&paymentLogs).Error

                if err != nil {
                        return response.InternalError(c, "Failed to retrieve payment logs")
                }

                return response.Paginated(c, paymentLogs, total, page, perPage)
        }
}

// ─── ORGANIZER REFUNDS ────────────────────────────────────────────────────

// CreateOrganizerRefund handles POST /api/v1/organizer/refunds
func CreateOrganizerRefund(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

                type refundReq struct {
                        OrderID string `json:"orderId"`
                        Amount  int    `json:"amount"`
                        Reason  string `json:"reason"`
                }

                var req refundReq
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                if req.OrderID == "" || req.Amount <= 0 || req.Reason == "" {
                        return response.BadRequest(c, "orderId, amount, and reason are required")
                }

                var order models.Order
                if err := db.Joins("JOIN events ON events.id = orders.event_id").
                        Where("orders.id = ? AND events.organizer_id = ?", req.OrderID, organizerID).
                        First(&order).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Order not found or not owned by this organizer")
                        }
                        return response.InternalError(c, "Failed to verify order")
                }

                refund := models.Refund{
                        OrganizerID: organizerID,
                        OrderID:     req.OrderID,
                        Amount:      req.Amount,
                        Reason:      req.Reason,
                        Status:      "pending",
                }

                if err := db.Create(&refund).Error; err != nil {
                        return response.InternalError(c, "Failed to create refund request")
                }

                return response.Created(c, "Refund request created successfully", refund)
        }
}

// GetOrganizerRefunds handles GET /api/v1/organizer/refunds
func GetOrganizerRefunds(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID, err := getOrganizerIDFromContext(c, db)
                if err != nil {
                        return err
                }

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

                var refunds []models.Refund
                var total int64

                query := db.Model(&models.Refund{}).Where("organizer_id = ?", organizerID)
                if status != "" {
                        query = query.Where("status = ?", status)
                }

                query.Count(&total)
                err = query.
                        Preload("Order").
                        Order("created_at DESC").
                        Limit(perPage).
                        Offset(offset).
                        Find(&refunds).Error

                if err != nil {
                        return response.InternalError(c, "Failed to retrieve refunds")
                }

                return response.Paginated(c, refunds, total, page, perPage)
        }
}


// GetAdminTicketTypes handles GET /api/v1/admin/ticket-types
func GetAdminTicketTypes(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        ticketTypes := []models.TicketType{}
        query := db.Model(&models.TicketType{})
        
        if eventID := c.Query("eventId"); eventID != "" {
            query = query.Where("event_id = ?", eventID)
        }
        
        if err := query.Order("created_at DESC").Find(&ticketTypes).Error; err != nil {
            return response.InternalError(c, "Failed to retrieve ticket types")
        }
        return c.JSON(fiber.Map{"data": ticketTypes})
    }
}

// UpdateAdminTicketType handles PUT /api/v1/admin/ticket-types/:ticketTypeId
func UpdateAdminTicketType(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        ticketTypeID := c.Params("ticketTypeId")
        if ticketTypeID == "" {
            return response.BadRequest(c, "Ticket type ID is required")
        }

        var ticketType models.TicketType
        if err := db.Where("id = ?", ticketTypeID).First(&ticketType).Error; err != nil {
            return response.NotFound(c, "Ticket type not found")
        }

        var req map[string]interface{}
        if err := c.BodyParser(&req); err != nil {
            return response.BadRequest(c, "Invalid request body")
        }

        updates := make(map[string]interface{})
        allowedFields := []string{"name", "price", "quota", "description", "tier", "zone", "emoji", "benefits"}
        for _, field := range allowedFields {
            if val, ok := req[field]; ok {
                updates[field] = val
            }
        }

        if len(updates) > 0 {
            if err := db.Model(&ticketType).Updates(updates).Error; err != nil {
                return response.InternalError(c, "Failed to update ticket type")
            }
        }

        db.Where("id = ?", ticketTypeID).First(&ticketType)
        return c.JSON(fiber.Map{"data": ticketType})
    }
}

// DeleteAdminTicketType handles DELETE /api/v1/admin/ticket-types/:ticketTypeId
func DeleteAdminTicketType(db *gorm.DB) fiber.Handler {
    return func(c *fiber.Ctx) error {
        ticketTypeID := c.Params("ticketTypeId")
        if ticketTypeID == "" {
            return response.BadRequest(c, "Ticket type ID is required")
        }

        var ticketType models.TicketType
        if err := db.Where("id = ?", ticketTypeID).First(&ticketType).Error; err != nil {
            return response.NotFound(c, "Ticket type not found")
        }

        if err := db.Delete(&ticketType).Error; err != nil {
            return response.InternalError(c, "Failed to delete ticket type")
        }

        return c.JSON(fiber.Map{"message": "Ticket type deleted successfully"})
    }
}
