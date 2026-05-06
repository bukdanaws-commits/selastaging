package services

import (
	"time"

	"github.com/bukdanaws-commits/seleevent/backend/internal/models"
	"gorm.io/gorm"
)

// ─── Organizer Service ──────────────────────────────────────────────────────

// OrganizerService handles organizer-related business logic.
type OrganizerService struct {
	DB *gorm.DB
}

// NewOrganizerService creates a new OrganizerService.
func NewOrganizerService(db *gorm.DB) *OrganizerService {
	return &OrganizerService{DB: db}
}

// GetOrganizerByUserID finds the organizerID from the User model.
// In this schema, the User table has an OrganizerID field.
func GetOrganizerByUserID(db *gorm.DB, userID string) (string, error) {
	var user models.User
	if err := db.Where("id = ?", userID).First(&user).Error; err != nil {
		return "", err
	}
	if user.OrganizerID == nil || *user.OrganizerID == "" {
		return "", gorm.ErrRecordNotFound
	}
	return *user.OrganizerID, nil
}

// FinanceSummary holds the financial summary for an organizer.
type FinanceSummary struct {
	TotalRevenue     int64 `json:"totalRevenue"`
	PlatformFees     int64 `json:"platformFees"`
	NetBalance       int64 `json:"netBalance"`
	TotalWithdrawn   int64 `json:"totalWithdrawn"`
	AvailableBalance int64 `json:"availableBalance"`
	PendingWithdrawals int64 `json:"pendingWithdrawals"`
}

// GetOrganizerFinance calculates balance, revenue, and fees for an organizer.
func GetOrganizerFinance(db *gorm.DB, organizerID string, eventID string) (*FinanceSummary, error) {
	summary := &FinanceSummary{}

	// Get events for this organizer
	eventQuery := db.Model(&models.Event{}).Where("organizer_id = ?", organizerID)
	if eventID != "" {
		eventQuery = eventQuery.Where("id = ?", eventID)
	}

	var eventIDs []string
	if err := eventQuery.Pluck("id", &eventIDs).Error; err != nil {
		return nil, err
	}

	if len(eventIDs) == 0 {
		return summary, nil
	}

	// Total revenue from paid orders
	db.Model(&models.Order{}).
		Where("event_id IN ? AND status = ?", eventIDs, "paid").
		Select("COALESCE(SUM(total_amount), 0)").
		Scan(&summary.TotalRevenue)

	// Calculate platform fees
	summary.PlatformFees = CalculatePlatformFee(db, organizerID, eventID)

	// Net balance = revenue - fees
	summary.NetBalance = summary.TotalRevenue - summary.PlatformFees

	// Total withdrawn (completed withdrawals)
	db.Model(&models.WithdrawalRequest{}).
		Where("organizer_id = ? AND status = ?", organizerID, "completed").
		Select("COALESCE(SUM(amount), 0)").
		Scan(&summary.TotalWithdrawn)

	// Pending withdrawals
	db.Model(&models.WithdrawalRequest{}).
		Where("organizer_id = ? AND status IN ?", organizerID, []string{"pending", "approved", "processing"}).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&summary.PendingWithdrawals)

	// Available balance = net - withdrawn - pending
	summary.AvailableBalance = summary.NetBalance - summary.TotalWithdrawn - summary.PendingWithdrawals
	if summary.AvailableBalance < 0 {
		summary.AvailableBalance = 0
	}

	return summary, nil
}

// CalculatePlatformFee calculates the total platform fees based on OrganizerFeeConfig.
func CalculatePlatformFee(db *gorm.DB, organizerID string, eventID string) int64 {
	// Get current fee config
	var feeConfig models.OrganizerFeeConfig
	if err := db.Where("organizer_id = ?", organizerID).First(&feeConfig).Error; err != nil {
		// No fee config, return 0
		return 0
	}

	feePercent := feeConfig.FeePercent
	if feePercent <= 0 {
		return 0
	}

	// Get event IDs
	eventQuery := db.Model(&models.Event{}).Where("organizer_id = ?", organizerID)
	if eventID != "" {
		eventQuery = eventQuery.Where("id = ?", eventID)
	}

	var eventIDs []string
	if err := eventQuery.Pluck("id", &eventIDs).Error; err != nil || len(eventIDs) == 0 {
		return 0
	}

	// Calculate fee from paid orders
	var totalRevenue int64
	db.Model(&models.Order{}).
		Where("event_id IN ? AND status = ?", eventIDs, "paid").
		Select("COALESCE(SUM(total_amount), 0)").
		Scan(&totalRevenue)

	// Also consider per-ticket-type platform fees
	type ticketTypeFee struct {
		PlatformFee float64
		Sold        int
		Price       int
	}
	var ticketFees []ticketTypeFee
	db.Model(&models.TicketType{}).
		Where("event_id IN ?", eventIDs).
		Select("platform_fee, sold, price").
		Scan(&ticketFees)

	var perTicketFeeTotal int64
	for _, tf := range ticketFees {
		perTicketFeeTotal += int64(float64(tf.Sold*tf.Price) * tf.PlatformFee / 100.0)
	}

	// Use the higher of the two calculations
	organizerFeeTotal := int64(float64(totalRevenue) * feePercent / 100.0)
	if perTicketFeeTotal > organizerFeeTotal {
		return perTicketFeeTotal
	}
	return organizerFeeTotal
}

// unused import guard
var _ = time.Now
