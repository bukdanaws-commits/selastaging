package services

import (
        "errors"
        "fmt"
        "time"

        "github.com/bukdanaws-commits/seleevent/backend/internal/models"
        "gorm.io/gorm"
)

// GateScanResult is the result of scanning a ticket at a gate.
type GateScanResult struct {
        Success         bool   `json:"success"`
        Action          string `json:"action"`
        TicketCode      string `json:"ticketCode"`
        AttendeeName    string `json:"attendeeName"`
        TicketTypeName  string `json:"ticketTypeName"`
        WristbandColor  string `json:"wristbandColor,omitempty"`
        ReentryCount    int64  `json:"reentryCount"`
        PreviousAction  string `json:"previousAction,omitempty"`
        Error           string `json:"error,omitempty"`
}

// GateStatusResult holds gate status info.
type GateStatusResult struct {
        Gate            any `json:"gate"`
        TotalInToday    int64       `json:"totalInToday"`
        TotalOutToday   int64       `json:"totalOutToday"`
        CurrentlyInside int64       `json:"currentlyInside"`
        Staff           any `json:"staff,omitempty"`
}

// GateService handles gate scanning operations.
type GateService struct {
        DB *gorm.DB
}

// NewGateService creates a new GateService.
func NewGateService(db *gorm.DB) *GateService {
        return &GateService{DB: db}
}

// ScanTicket processes a ticket scan at a gate.
func (s *GateService) ScanTicket(ticketCode, gateID, staffID, action string) (*GateScanResult, error) {
        // 1. Find ticket by code
        var ticket models.Ticket
        if err := s.DB.Where("ticket_code = ?", ticketCode).First(&ticket).Error; err != nil {
                if errors.Is(err, gorm.ErrRecordNotFound) {
                        return &GateScanResult{Success: false, Error: "Ticket not found"}, nil
                }
                return nil, err
        }

        // 2. Check if ticket is cancelled
        if ticket.Status == "cancelled" {
                return &GateScanResult{Success: false, Error: "Ticket has been cancelled"}, nil
        }

        // 3. Validate action against current status
        switch action {
        case "IN":
                if ticket.Status == "inside" {
                        return &GateScanResult{
                                Success:  false,
                                Action:   action,
                                Error:    "Attendee is already inside the venue",
                                TicketCode: ticketCode,
                        }, nil
                }
                if ticket.Status != "redeemed" && ticket.Status != "outside" {
                        return &GateScanResult{
                                Success:  false,
                                Action:   action,
                                Error:    fmt.Sprintf("Ticket must be redeemed or outside to enter. Current status: %s", ticket.Status),
                                TicketCode: ticketCode,
                        }, nil
                }
                // Valid IN: status becomes "inside"
                ticket.Status = "inside"

        case "OUT":
                if ticket.Status != "inside" {
                        return &GateScanResult{
                                Success:  false,
                                Action:   action,
                                Error:    fmt.Sprintf("Attendee is not inside. Current status: %s", ticket.Status),
                                TicketCode: ticketCode,
                        }, nil
                }
                // Valid OUT: status becomes "outside"
                ticket.Status = "outside"

        default:
                return nil, fmt.Errorf("invalid action: %s", action)
        }

        // 4. Get ticket type and wristband info
        var ticketType models.TicketType
        if err := s.DB.Where("id = ?", ticket.TicketTypeID).First(&ticketType).Error; err != nil {
                return nil, err
        }

        // 5. Count previous IN scans for re-entry tracking
        var reentryCount int64
        s.DB.Model(&models.GateLog{}).Where("ticket_id = ? AND action = ?", ticket.ID, "IN").Count(&reentryCount)

        // Get previous action if any
        var previousLog models.GateLog
        var previousAction string
        if err := s.DB.Where("ticket_id = ?", ticket.ID).Order("scanned_at DESC").First(&previousLog).Error; err == nil {
                previousAction = previousLog.Action
        }

        // 6. Get wristband color from redemption
        var redemption models.Redemption
        var wristbandColor string
        if err := s.DB.Where("ticket_id = ?", ticket.ID).First(&redemption).Error; err == nil {
                wristbandColor = redemption.WristbandColor
        }

        // 7. Create GateLog and update ticket status within a transaction
        tx := s.DB.Begin()

        gateLog := models.GateLog{
                TenantID:  ticket.TenantID,
                TicketID:  ticket.ID,
                GateID:    gateID,
                StaffID:   staffID,
                EventID:   ticket.EventID,
                Action:    action,
                ScannedAt: time.Now(),
        }
        if err := tx.Create(&gateLog).Error; err != nil {
                tx.Rollback()
                return nil, err
        }

        // 8. Update ticket status
        if err := tx.Model(&ticket).Updates(map[string]any{
                "status":     ticket.Status,
                "updated_at": time.Now(),
        }).Error; err != nil {
                tx.Rollback()
                return nil, err
        }

        tx.Commit()

        // 9. Broadcast SSE event
        Hub.Broadcast("gate_scan", map[string]any{
                "gateLogId":     gateLog.ID,
                "ticketCode":    ticketCode,
                "attendeeName":  ticket.AttendeeName,
                "ticketTypeName": ticketType.Name,
                "action":        action,
                "gateId":        gateID,
                "staffId":       staffID,
                "reentryCount":  reentryCount,
                "scannedAt":     gateLog.ScannedAt.Format("2006-01-02T15:04:05Z07:00"),
        })

        return &GateScanResult{
                Success:        true,
                Action:         action,
                TicketCode:     ticketCode,
                AttendeeName:   ticket.AttendeeName,
                TicketTypeName: ticketType.Name,
                WristbandColor: wristbandColor,
                ReentryCount:   reentryCount,
                PreviousAction: previousAction,
        }, nil
}

// GetGateLogs retrieves gate scan logs with pagination.
func (s *GateService) GetGateLogs(gateID string, limit, offset int) ([]models.GateLog, int64, error) {
        var logs []models.GateLog
        var total int64

        query := s.DB.Model(&models.GateLog{}).Where("gate_id = ?", gateID)
        query.Count(&total)

        err := query.
                Preload("Ticket").
                Preload("Staff").
                Preload("Gate").
                Order("scanned_at DESC").
                Limit(limit).
                Offset(offset).
                Find(&logs).Error

        return logs, total, err
}

// GetGateStatus retrieves the current status of a gate.
func (s *GateService) GetGateStatus(gateID, staffID string) (*GateStatusResult, error) {
        var gate models.Gate
        if err := s.DB.Where("id = ?", gateID).First(&gate).Error; err != nil {
                return nil, err
        }

        // Count IN and OUT today
        today := time.Now().Truncate(24 * time.Hour)
        var totalInToday, totalOutToday int64
        s.DB.Model(&models.GateLog{}).
                Where("gate_id = ? AND action = ? AND scanned_at >= ?", gateID, "IN", today).
                Count(&totalInToday)
        s.DB.Model(&models.GateLog{}).
                Where("gate_id = ? AND action = ? AND scanned_at >= ?", gateID, "OUT", today).
                Count(&totalOutToday)

        // Count currently inside (tickets with status=inside for this event)
        var currentlyInside int64
        s.DB.Model(&models.Ticket{}).
                Joins("JOIN orders ON orders.id = tickets.order_id").
                Joins("JOIN events ON events.id = orders.event_id").
                Joins("JOIN gates ON gates.event_id = events.id").
                Where("gates.id = ? AND tickets.status = ?", gateID, "inside").
                Count(&currentlyInside)

        var staff any
        if staffID != "" {
                var user models.User
                if s.DB.Where("id = ?", staffID).First(&user).Error == nil {
                        staff = &user
                }
        }

        return &GateStatusResult{
                Gate:            &gate,
                TotalInToday:    totalInToday,
                TotalOutToday:   totalOutToday,
                CurrentlyInside: currentlyInside,
                Staff:           staff,
        }, nil
}
