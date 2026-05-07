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

// ─── ADMIN COUPON CRUD ────────────────────────────────────────────────────

// GetAdminCoupons handles GET /api/v1/admin/coupons
func GetAdminCoupons(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                page, _ := strconv.Atoi(c.Query("page", "1"))
                perPage, _ := strconv.Atoi(c.Query("perPage", "20"))
                status := c.Query("status")
                scope := c.Query("scope")

                if page < 1 {
                        page = 1
                }
                if perPage < 1 || perPage > 100 {
                        perPage = 20
                }
                offset := (page - 1) * perPage

                var coupons []models.Coupon
                var total int64

                query := db.Model(&models.Coupon{})
                if status != "" {
                        query = query.Where("status = ?", status)
                }
                if scope != "" {
                        query = query.Where("scope = ?", scope)
                }

                query.Count(&total)
                err := query.
                        Order("created_at DESC").
                        Limit(perPage).
                        Offset(offset).
                        Find(&coupons).Error

                if err != nil {
                        return response.InternalError(c, "Failed to retrieve coupons")
                }

                return response.Paginated(c, coupons, total, page, perPage)
        }
}

// CreateAdminCoupon handles POST /api/v1/admin/coupons
func CreateAdminCoupon(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                type createCouponReq struct {
                        TenantID          string  `json:"tenantId"`
                        OrganizerID       string  `json:"organizerId"`
                        Code              string  `json:"code"`
                        Name              string  `json:"name"`
                        Description       *string `json:"description,omitempty"`
                        DiscountType      string  `json:"discountType"`
                        DiscountValue     float64 `json:"discountValue"`
                        MaxDiscount       *float64 `json:"maxDiscount,omitempty"`
                        Scope             string  `json:"scope"`
                        EventID           *string `json:"eventId,omitempty"`
                        CategoryConfigs   *string `json:"categoryConfigs,omitempty"`
                        UsageLimit        int     `json:"usageLimit"`
                        UsageLimitPerUser int     `json:"usageLimitPerUser"`
                        Status            string  `json:"status"`
                        StartsAt          string  `json:"startsAt"`
                        ExpiresAt         string  `json:"expiresAt"`
                }

                var req createCouponReq
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                if req.Code == "" || req.Name == "" || req.DiscountType == "" || req.DiscountValue <= 0 {
                        return response.BadRequest(c, "code, name, discountType, and discountValue are required")
                }

                if req.DiscountType != "percentage" && req.DiscountType != "nominal" {
                        return response.BadRequest(c, "discountType must be 'percentage' or 'nominal'")
                }

                if req.Scope == "" {
                        req.Scope = "global"
                }

                if req.Status == "" {
                        req.Status = "active"
                }

                if req.UsageLimit <= 0 {
                        req.UsageLimit = 100
                }
                if req.UsageLimitPerUser <= 0 {
                        req.UsageLimitPerUser = 1
                }

                startsAt, err := parseCouponTime(req.StartsAt)
                if err != nil {
                        return response.BadRequest(c, "Invalid startsAt format, use RFC3339")
                }

                expiresAt, err := parseCouponTime(req.ExpiresAt)
                if err != nil {
                        return response.BadRequest(c, "Invalid expiresAt format, use RFC3339")
                }

                // Check unique code
                var existingCount int64
                db.Model(&models.Coupon{}).Where("code = ?", req.Code).Count(&existingCount)
                if existingCount > 0 {
                        return response.BadRequest(c, "Coupon code already exists")
                }

                // Get tenantID and organizerID from user if not provided
                if req.TenantID == "" || req.OrganizerID == "" {
                        userID, _ := c.Locals("userID").(string)
                        var user models.User
                        if db.Where("id = ?", userID).First(&user).Error == nil {
                                if req.TenantID == "" {
                                        req.TenantID = "default"
                                }
                                if req.OrganizerID == "" && user.OrganizerID != nil {
                                        req.OrganizerID = *user.OrganizerID
                                }
                        }
                }

                coupon := models.Coupon{
                        TenantID:          req.TenantID,
                        OrganizerID:       req.OrganizerID,
                        Code:              req.Code,
                        Name:              req.Name,
                        Description:       req.Description,
                        DiscountType:      req.DiscountType,
                        DiscountValue:     req.DiscountValue,
                        MaxDiscount:       req.MaxDiscount,
                        Scope:             req.Scope,
                        EventID:           req.EventID,
                        CategoryConfigs:   req.CategoryConfigs,
                        UsageLimit:        req.UsageLimit,
                        UsageLimitPerUser: req.UsageLimitPerUser,
                        Status:            req.Status,
                        StartsAt:          startsAt,
                        ExpiresAt:         expiresAt,
                }

                if err := db.Create(&coupon).Error; err != nil {
                        return response.InternalError(c, "Failed to create coupon")
                }

                return response.Created(c, "Coupon created successfully", coupon)
        }
}

// UpdateAdminCoupon handles PUT /api/v1/admin/coupons/:id
func UpdateAdminCoupon(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                couponID := c.Params("id")
                if couponID == "" {
                        return response.BadRequest(c, "Coupon ID is required")
                }

                var coupon models.Coupon
                if err := db.Where("id = ?", couponID).First(&coupon).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Coupon not found")
                        }
                        return response.InternalError(c, "Failed to retrieve coupon")
                }

                type updateCouponReq struct {
                        Name              *string  `json:"name"`
                        Description       *string  `json:"description"`
                        DiscountType      *string  `json:"discountType"`
                        DiscountValue     *float64 `json:"discountValue"`
                        MaxDiscount       *float64 `json:"maxDiscount"`
                        Scope             *string  `json:"scope"`
                        EventID           *string  `json:"eventId"`
                        CategoryConfigs   *string  `json:"categoryConfigs"`
                        UsageLimit        *int     `json:"usageLimit"`
                        UsageLimitPerUser *int     `json:"usageLimitPerUser"`
                        Status            *string  `json:"status"`
                        StartsAt          *string  `json:"startsAt"`
                        ExpiresAt         *string  `json:"expiresAt"`
                }

                var req updateCouponReq
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
                if req.DiscountType != nil {
                        if *req.DiscountType != "percentage" && *req.DiscountType != "nominal" {
                                return response.BadRequest(c, "discountType must be 'percentage' or 'nominal'")
                        }
                        updates["discount_type"] = *req.DiscountType
                }
                if req.DiscountValue != nil {
                        updates["discount_value"] = *req.DiscountValue
                }
                if req.MaxDiscount != nil {
                        updates["max_discount"] = *req.MaxDiscount
                }
                if req.Scope != nil {
                        updates["scope"] = *req.Scope
                }
                if req.EventID != nil {
                        updates["event_id"] = req.EventID
                }
                if req.CategoryConfigs != nil {
                        updates["category_configs"] = req.CategoryConfigs
                }
                if req.UsageLimit != nil {
                        updates["usage_limit"] = *req.UsageLimit
                }
                if req.UsageLimitPerUser != nil {
                        updates["usage_limit_per_user"] = *req.UsageLimitPerUser
                }
                if req.Status != nil {
                        updates["status"] = *req.Status
                }
                if req.StartsAt != nil {
                        parsed, err := parseCouponTime(*req.StartsAt)
                        if err != nil {
                                return response.BadRequest(c, "Invalid startsAt format")
                        }
                        updates["starts_at"] = parsed
                }
                if req.ExpiresAt != nil {
                        parsed, err := parseCouponTime(*req.ExpiresAt)
                        if err != nil {
                                return response.BadRequest(c, "Invalid expiresAt format")
                        }
                        updates["expires_at"] = parsed
                }

                if len(updates) == 0 {
                        return response.BadRequest(c, "No fields to update")
                }

                if err := db.Model(&coupon).Updates(updates).Error; err != nil {
                        return response.InternalError(c, "Failed to update coupon")
                }

                // Reload
                db.Where("id = ?", couponID).First(&coupon)
                return response.OK(c, coupon)
        }
}

// DeleteAdminCoupon handles DELETE /api/v1/admin/coupons/:id
func DeleteAdminCoupon(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                couponID := c.Params("id")
                if couponID == "" {
                        return response.BadRequest(c, "Coupon ID is required")
                }

                var coupon models.Coupon
                if err := db.Where("id = ?", couponID).First(&coupon).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Coupon not found")
                        }
                        return response.InternalError(c, "Failed to retrieve coupon")
                }

                // Soft delete
                if err := db.Delete(&coupon).Error; err != nil {
                        return response.InternalError(c, "Failed to delete coupon")
                }

                return response.Success(c, "Coupon deleted successfully", fiber.Map{
                        "success": true,
                })
        }
}

// ─── PUBLIC COUPON VALIDATION ─────────────────────────────────────────────

// ValidateCoupon handles POST /api/v1/coupons/validate
func ValidateCoupon(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                type validateReq struct {
                        Code     string  `json:"code"`
                        OrderID  string  `json:"orderId,omitempty"`
                        Subtotal float64 `json:"subtotal"`
                        Category *string `json:"category,omitempty"`
                }

                var req validateReq
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                if req.Code == "" {
                        return response.BadRequest(c, "Coupon code is required")
                }

                // Get userID if authenticated (optional for this endpoint)
                userID, _ := c.Locals("userID").(string)

                category := ""
                if req.Category != nil {
                        category = *req.Category
                }

                result, err := services.ValidateCoupon(db, req.Code, userID, req.Subtotal, category)
                if err != nil {
                        return response.InternalError(c, "Failed to validate coupon")
                }

                return response.OK(c, result)
        }
}

// ─── HELPER ───────────────────────────────────────────────────────────────

func parseCouponTime(s string) (time.Time, error) {
        if s == "" {
                return time.Time{}, fmt.Errorf("empty time string")
        }
        // Support multiple formats
        formats := []string{
                time.RFC3339,
                "2006-01-02T15:04:05Z",
                "2006-01-02 15:04:05",
                "2006-01-02",
        }
        for _, f := range formats {
                t, err := time.Parse(f, s)
                if err == nil {
                        return t, nil
                }
        }
        return time.Time{}, fmt.Errorf("invalid time format: %s", s)
}
