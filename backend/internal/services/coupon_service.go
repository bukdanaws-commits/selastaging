package services

import (
	"errors"
	"time"

	"github.com/bukdanaws-commits/seleevent/backend/internal/models"
	"gorm.io/gorm"
)

// ─── Coupon Service ──────────────────────────────────────────────────────────

// CouponService handles coupon-related business logic.
type CouponService struct {
	DB *gorm.DB
}

// NewCouponService creates a new CouponService.
func NewCouponService(db *gorm.DB) *CouponService {
	return &CouponService{DB: db}
}

// CouponValidationResult holds the result of a coupon validation.
type CouponValidationResult struct {
	Valid          bool           `json:"valid"`
	DiscountAmount float64        `json:"discountAmount"`
	Message        string         `json:"message,omitempty"`
	Coupon         *models.Coupon `json:"coupon,omitempty"`
}

// ValidateCoupon validates a coupon code and calculates the discount amount.
func ValidateCoupon(db *gorm.DB, code string, userID string, orderSubtotal float64, category string) (*CouponValidationResult, error) {
	result := &CouponValidationResult{Valid: false}

	// Find coupon by code
	var coupon models.Coupon
	if err := db.Where("code = ?", code).First(&coupon).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			result.Message = "Coupon not found"
			return result, nil
		}
		return nil, err
	}

	// Check status
	if coupon.Status != "active" {
		result.Message = "Coupon is not active"
		return result, nil
	}

	// Check date range
	now := time.Now()
	if now.Before(coupon.StartsAt) {
		result.Message = "Coupon is not yet active"
		return result, nil
	}
	if now.After(coupon.ExpiresAt) {
		result.Message = "Coupon has expired"
		return result, nil
	}

	// Check global usage limit
	if coupon.UsageLimit > 0 && coupon.UsedCount >= coupon.UsageLimit {
		result.Message = "Coupon usage limit has been reached"
		return result, nil
	}

	// Check per-user usage limit
	if coupon.UsageLimitPerUser > 0 && userID != "" {
		var userUsageCount int64
		db.Model(&models.CouponUsage{}).
			Where("coupon_id = ? AND user_id = ?", coupon.ID, userID).
			Count(&userUsageCount)
		if int(userUsageCount) >= coupon.UsageLimitPerUser {
			result.Message = "You have already used this coupon the maximum number of times"
			return result, nil
		}
	}

	// Calculate discount
	var discountAmount float64
	switch coupon.DiscountType {
	case "percentage":
		discountAmount = orderSubtotal * coupon.DiscountValue / 100.0
		if coupon.MaxDiscount != nil && discountAmount > *coupon.MaxDiscount {
			discountAmount = *coupon.MaxDiscount
		}
	case "nominal":
		discountAmount = coupon.DiscountValue
	default:
		result.Message = "Invalid discount type"
		return result, nil
	}

	// Don't allow discount greater than subtotal
	if discountAmount > orderSubtotal {
		discountAmount = orderSubtotal
	}

	result.Valid = true
	result.DiscountAmount = discountAmount
	result.Coupon = &coupon
	return result, nil
}

// ApplyCoupon records a coupon usage.
func ApplyCoupon(db *gorm.DB, couponID string, userID string, orderID string, discountAmount float64) error {
	usage := models.CouponUsage{
		CouponID:       couponID,
		UserID:         userID,
		OrderID:        orderID,
		DiscountAmount: discountAmount,
	}

	if err := db.Create(&usage).Error; err != nil {
		return err
	}

	// Increment used count
	return db.Model(&models.Coupon{}).
		Where("id = ?", couponID).
		Update("used_count", gorm.Expr("used_count + 1")).Error
}
