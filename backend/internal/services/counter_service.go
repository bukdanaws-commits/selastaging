package services

import (
	"errors"
	"time"

	"github.com/bukdanaws-commits/seleevent/backend/internal/models"
	"gorm.io/gorm"
)

// RedeemResult is the result of scanning and redeeming a ticket.
type RedeemResult struct {
	Success        bool   `json:"success"`
	WristbandColor string `json:"wristbandColor"`
	WristbandType  string `json:"wristbandType"`
	TicketTypeName string `json:"ticketTypeName"`
	AttendeeName   string `json:"attendeeName"`
	Error          string `json:"error,omitempty"`
}

// CounterStatusResult holds counter status info.
type CounterStatusResult struct {
	Counter          interface{} `json:"counter"`
	RedemptionsToday int64       `json:"redemptionsToday"`
	Inventory        interface{} `json:"inventory,omitempty"`
}

// CounterService handles counter/wristband redemption operations.
type CounterService struct {
	DB *gorm.DB
}

// NewCounterService creates a new CounterService.
func NewCounterService(db *gorm.DB) *CounterService {
	return &CounterService{DB: db}
}

// ScanAndRedeem scans a ticket, validates it, and performs wristband exchange.
func (s *CounterService) ScanAndRedeem(ticketCode, counterID, staffID, wristbandCode, notes string) (*RedeemResult, error) {
	// 1. Find ticket by code
	var ticket models.Ticket
	if err := s.DB.Where("ticket_code = ?", ticketCode).First(&ticket).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &RedeemResult{Success: false, Error: "Ticket not found"}, nil
		}
		return nil, err
	}

	// 2. Validate ticket status
	if ticket.Status != "active" {
		return &RedeemResult{
			Success: false,
			Error:   "Ticket is not eligible for redemption (status: " + ticket.Status + ")",
		}, nil
	}

	// 3. Get ticket type to determine wristband color/type
	var ticketType models.TicketType
	if err := s.DB.Where("id = ?", ticket.TicketTypeID).First(&ticketType).Error; err != nil {
		return nil, err
	}

	// 4. Get order to find event
	var order models.Order
	if err := s.DB.Where("id = ?", ticket.OrderID).First(&order).Error; err != nil {
		return nil, err
	}

	// 5. Find wristband inventory matching ticket type for the event
	var inventory models.WristbandInventory
	if err := s.DB.Where("event_id = ? AND type = ?", order.EventID, ticketType.Name).First(&inventory).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &RedeemResult{Success: false, Error: "Wristband inventory not found for this ticket type"}, nil
		}
		return nil, err
	}

	// 6. Check wristband stock
	if inventory.RemainingStock <= 0 {
		return &RedeemResult{Success: false, Error: "No wristbands remaining for this type"}, nil
	}

	// 7. Create Redemption record
	redemption := models.Redemption{
		TenantID:       ticket.TenantID,
		TicketID:       ticket.ID,
		CounterID:      counterID,
		StaffID:        staffID,
		WristbandCode:  wristbandCode,
		WristbandColor: inventory.Color,
		WristbandType:  inventory.Type,
		RedeemedAt:     time.Now(),
	}
	if notes != "" {
		redemption.Notes = &notes
	}

	tx := s.DB.Begin()

	if err := tx.Create(&redemption).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 8. Update ticket status
	now := time.Now()
	if err := tx.Model(&ticket).Updates(map[string]interface{}{
		"status":         "redeemed",
		"redeemed_at":    now,
		"redeemed_by":    staffID,
		"wristband_code": wristbandCode,
		"updated_at":     now,
	}).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 9. Deduct from wristband inventory
	if err := tx.Model(&inventory).Updates(map[string]interface{}{
		"remaining_stock": gorm.Expr("remaining_stock - 1"),
		"used_stock":      gorm.Expr("used_stock + 1"),
		"updated_at":      now,
	}).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	tx.Commit()

	// 10. Broadcast SSE event
	Hub.Broadcast("redemption", map[string]interface{}{
		"redemptionId":   redemption.ID,
		"ticketCode":     ticketCode,
		"attendeeName":   ticket.AttendeeName,
		"ticketTypeName": ticketType.Name,
		"wristbandCode":  wristbandCode,
		"wristbandColor": inventory.Color,
		"counterId":      counterID,
		"staffId":        staffID,
		"redeemedAt":     redemption.RedeemedAt.Format("2006-01-02T15:04:05Z07:00"),
	})

	return &RedeemResult{
		Success:        true,
		WristbandColor: inventory.Color,
		WristbandType:  inventory.Type,
		TicketTypeName: ticketType.Name,
		AttendeeName:   ticket.AttendeeName,
	}, nil
}

// GetMyRedemptions retrieves redemption history for a staff member.
func (s *CounterService) GetMyRedemptions(staffID string, limit, offset int) ([]models.Redemption, int64, error) {
	var redemptions []models.Redemption
	var total int64

	query := s.DB.Model(&models.Redemption{}).Where("staff_id = ?", staffID)
	query.Count(&total)

	err := query.
		Preload("Ticket").
		Preload("Counter").
		Order("redeemed_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&redemptions).Error

	return redemptions, total, err
}

// GetCounterStatus retrieves the status of a counter.
func (s *CounterService) GetCounterStatus(counterID, staffID string) (*CounterStatusResult, error) {
	var counter models.Counter
	if err := s.DB.Where("id = ?", counterID).First(&counter).Error; err != nil {
		return nil, err
	}

	today := time.Now().Truncate(24 * time.Hour)
	var redemptionsToday int64
	s.DB.Model(&models.Redemption{}).
		Where("counter_id = ? AND redeemed_at >= ?", counterID, today).
		Count(&redemptionsToday)

	// Get wristband inventory for the event
	var inventory []models.WristbandInventory
	s.DB.Where("event_id = ?", counter.EventID).Find(&inventory)

	return &CounterStatusResult{
		Counter:          &counter,
		RedemptionsToday: redemptionsToday,
		Inventory:        inventory,
	}, nil
}
