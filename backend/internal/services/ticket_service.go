package services

import (
	"errors"

	"github.com/bukdanaws-commits/seleevent/backend/internal/models"
	"gorm.io/gorm"
)

// CheckTicketResult is the result of checking a ticket.
type CheckTicketResult struct {
	Found          bool   `json:"found"`
	TicketCode     string `json:"ticketCode,omitempty"`
	TicketTypeName string `json:"ticketTypeName,omitempty"`
	AttendeeName   string `json:"attendeeName,omitempty"`
	AttendeeEmail  string `json:"attendeeEmail,omitempty"`
	SeatLabel      string `json:"seatLabel,omitempty"`
	Status         string `json:"status,omitempty"`
	RedeemedAt     string `json:"redeemedAt,omitempty"`
	WristbandCode  string `json:"wristbandCode,omitempty"`
	WristbandColor string `json:"wristbandColor,omitempty"`
	Price          int    `json:"price,omitempty"`
	EventName      string `json:"eventName,omitempty"`
	EventDate      string `json:"eventDate,omitempty"`
	Error          string `json:"error,omitempty"`
}

// TicketService handles ticket operations.
type TicketService struct {
	DB *gorm.DB
}

// NewTicketService creates a new TicketService.
func NewTicketService(db *gorm.DB) *TicketService {
	return &TicketService{DB: db}
}

// CheckTicket looks up a ticket by its code and returns details.
func (s *TicketService) CheckTicket(ticketCode string) (*CheckTicketResult, error) {
	var ticket models.Ticket
	err := s.DB.Where("ticket_code = ?", ticketCode).First(&ticket).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &CheckTicketResult{
				Found: false,
				Error: "Ticket not found",
			}, nil
		}
		return nil, err
	}

	var order models.Order
	if err := s.DB.Where("id = ?", ticket.OrderID).First(&order).Error; err != nil {
		return nil, err
	}

	var ticketType models.TicketType
	if err := s.DB.Where("id = ?", ticket.TicketTypeID).First(&ticketType).Error; err != nil {
		return nil, err
	}

	var event models.Event
	if err := s.DB.Where("id = ?", order.EventID).First(&event).Error; err != nil {
		return nil, err
	}

	result := &CheckTicketResult{
		Found:          true,
		TicketCode:     ticket.TicketCode,
		TicketTypeName: ticketType.Name,
		AttendeeName:   ticket.AttendeeName,
		AttendeeEmail:  ticket.AttendeeEmail,
		Status:         ticket.Status,
		Price:          ticketType.Price,
		EventName:      event.Title,
		EventDate:      event.Date.Format("2006-01-02T15:04:05Z07:00"),
	}

	if ticket.SeatLabel != nil {
		result.SeatLabel = *ticket.SeatLabel
	}
	if ticket.RedeemedAt != nil {
		result.RedeemedAt = ticket.RedeemedAt.Format("2006-01-02T15:04:05Z07:00")
	}
	if ticket.WristbandCode != nil {
		result.WristbandCode = *ticket.WristbandCode
	}

	// Look up wristband color from redemption if available
	var redemption models.Redemption
	if s.DB.Where("ticket_id = ?", ticket.ID).First(&redemption).Error == nil {
		result.WristbandColor = redemption.WristbandColor
	}

	return result, nil
}

// GetEventTicketTypes returns all ticket types for a given event.
func (s *TicketService) GetEventTicketTypes(eventID string) ([]models.TicketType, error) {
	var types []models.TicketType
	err := s.DB.Where("event_id = ?", eventID).Find(&types).Error
	return types, err
}
