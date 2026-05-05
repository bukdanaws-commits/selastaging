package services

import (
        "errors"
        "fmt"
        "log"
        "math/rand"
        "time"

        "github.com/bukdanaws-commits/seleevent/backend/internal/models"
        "gorm.io/gorm"
)

// ─── Order Service ───────────────────────────────────────────────────────────

// OrderItemInput is the input DTO for creating an order item.
type OrderItemInput struct {
        TicketTypeID string `json:"ticketTypeId"`
        Quantity     int    `json:"quantity"`
        AttendeeName string `json:"attendeeName"`
        AttendeeEmail string `json:"attendeeEmail"`
}

// OrderService handles order processing logic.
type OrderService struct {
        DB *gorm.DB
}

// NewOrderService creates a new OrderService.
func NewOrderService(db *gorm.DB) *OrderService {
        return &OrderService{DB: db}
}

// generateOrderCode generates a unique order code with format SEL-XXXXXXXX.
func generateOrderCode() string {
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        b := make([]byte, 8)
        for i := range b {
                b[i] = charset[rand.Intn(len(charset))]
        }
        return "SEL-" + string(b)
}

// generateTicketCode generates a unique ticket code with format TK-XXXXXXXX.
func generateTicketCode() string {
        const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        b := make([]byte, 8)
        for i := range b {
                b[i] = charset[rand.Intn(len(charset))]
        }
        return "TK-" + string(b)
}

// CreateOrder creates a new order with status "pending" and a 30-minute expiry.
func (s *OrderService) CreateOrder(userID string, eventID string, items []OrderItemInput) (*models.Order, error) {
        if len(items) == 0 {
                return nil, errors.New("at least one item is required")
        }

        // Get event to derive TenantID
        var event models.Event
        if err := s.DB.Where("id = ?", eventID).First(&event).Error; err != nil {
                return nil, fmt.Errorf("event %s not found", eventID)
        }

        // Calculate total amount and validate ticket types
        var totalAmount int
        type itemCalc struct {
                input       OrderItemInput
                ticketType  models.TicketType
                pricePerTicket int
                subtotal    int
        }
        var calculations []itemCalc

        for _, item := range items {
                if item.Quantity <= 0 {
                        return nil, fmt.Errorf("invalid quantity for ticket type %s", item.TicketTypeID)
                }

                var ticketType models.TicketType
                if err := s.DB.Where("id = ? AND event_id = ?", item.TicketTypeID, eventID).First(&ticketType).Error; err != nil {
                        return nil, fmt.Errorf("ticket type %s not found for this event", item.TicketTypeID)
                }

                // Check availability
                if ticketType.Sold+item.Quantity > ticketType.Quota {
                        return nil, fmt.Errorf("not enough quota for ticket type %s (remaining: %d)", ticketType.Name, ticketType.Quota-ticketType.Sold)
                }

                subtotal := ticketType.Price * item.Quantity
                totalAmount += subtotal

                calculations = append(calculations, itemCalc{
                        input:          item,
                        ticketType:     ticketType,
                        pricePerTicket: ticketType.Price,
                        subtotal:       subtotal,
                })
        }

        // Start transaction
        tx := s.DB.Begin()
        defer func() {
                if r := recover(); r != nil {
                        tx.Rollback()
                }
        }()

        // Create order
        orderCode := generateOrderCode()
        expiresAt := time.Now().Add(30 * time.Minute)

        order := models.Order{
                TenantID:    event.TenantID,
                OrderCode:   orderCode,
                UserID:      userID,
                EventID:     eventID,
                TotalAmount: totalAmount,
                Status:      "pending",
                ExpiresAt:   &expiresAt,
        }

        if err := tx.Create(&order).Error; err != nil {
                tx.Rollback()
                return nil, fmt.Errorf("failed to create order: %w", err)
        }

        // Create order items
        for _, calc := range calculations {
                orderItem := models.OrderItem{
                        TenantID:      event.TenantID,
                        OrderID:       order.ID,
                        TicketTypeID:  calc.input.TicketTypeID,
                        Quantity:      calc.input.Quantity,
                        PricePerTicket: calc.pricePerTicket,
                        Subtotal:      calc.subtotal,
                }
                if err := tx.Create(&orderItem).Error; err != nil {
                        tx.Rollback()
                        return nil, fmt.Errorf("failed to create order item: %w", err)
                }

                // Update sold count
                if err := tx.Model(&models.TicketType{}).Where("id = ?", calc.input.TicketTypeID).
                        Update("sold", gorm.Expr("sold + ?", calc.input.Quantity)).Error; err != nil {
                        tx.Rollback()
                        return nil, fmt.Errorf("failed to update ticket type sold count: %w", err)
                }
        }

        if err := tx.Commit().Error; err != nil {
                return nil, fmt.Errorf("failed to commit order transaction: %w", err)
        }

        // Load relations
        s.DB.Preload("Items").Preload("Items.TicketType").First(&order, "id = ?", order.ID)

        return &order, nil
}

// ProcessPaymentCallback processes a Midtrans payment callback.
// It updates the order status and generates/activates tickets if payment is successful.
// If tickets already exist with "pending" status, they are updated to "active".
// If no tickets exist yet, they are created with "active" status.
func (s *OrderService) ProcessPaymentCallback(orderCode string, paymentType string, transactionStatus string, midtransTxID string) error {
        var order models.Order
        if err := s.DB.Preload("Items").Preload("Items.TicketType").Preload("Tickets").Preload("Event").Where("order_code = ?", orderCode).First(&order).Error; err != nil {
                return fmt.Errorf("order not found: %w", err)
        }

        // Idempotency: if already processed, skip
        if order.Status == "paid" || order.Status == "cancelled" || order.Status == "expired" {
                return nil
        }

        tx := s.DB.Begin()
        defer func() {
                if r := recover(); r != nil {
                        tx.Rollback()
                }
        }()

        now := time.Now()

        switch transactionStatus {
        case "capture", "settlement":
                // Payment successful
                paymentTypeStr := paymentType
                midtransID := midtransTxID

                updates := map[string]interface{}{
                        "status":                  "paid",
                        "paid_at":                 now,
                        "payment_type":            paymentTypeStr,
                        "midtrans_transaction_id": midtransID,
                }
                if err := tx.Model(&order).Updates(updates).Error; err != nil {
                        tx.Rollback()
                        return fmt.Errorf("failed to update order status to paid: %w", err)
                }

                // Check if tickets already exist (created as "pending" during order creation)
                if len(order.Tickets) > 0 {
                        // Update all pending tickets to active
                        if err := tx.Model(&models.Ticket{}).
                                Where("order_id = ? AND status = ?", order.ID, "pending").
                                Update("status", "active").Error; err != nil {
                                tx.Rollback()
                                return fmt.Errorf("failed to activate pending tickets: %w", err)
                        }
                        log.Printf("[Order] Activated %d pending tickets for order %s", len(order.Tickets), order.OrderCode)
                } else {
                        // Generate tickets for each order item (no pre-existing tickets)
                        for _, item := range order.Items {
                                for i := 0; i < item.Quantity; i++ {
                                        ticketCode := generateTicketCode()
                                        qrData := ticketCode

                                        // Get attendee info from order's user
                                        var user models.User
                                        if err := s.DB.Where("id = ?", order.UserID).First(&user).Error; err != nil {
                                                log.Printf("[Order] Warning: could not load user for ticket generation: %v", err)
                                        }

                                        attendeeName := user.Name
                                        attendeeEmail := user.Email

                                        // Load ticket type to check for seat config
                                        var ticketType models.TicketType
                                        s.DB.Where("id = ?", item.TicketTypeID).First(&ticketType)

                                        var seatLabel *string
                                        if ticketType.SeatConfig != nil {
                                                zone := "Z"
                                                if ticketType.Zone != nil {
                                                        zone = *ticketType.Zone
                                                }
                                                label := fmt.Sprintf("%s-%d", zone, i+1)
                                                seatLabel = &label
                                        }

                                        ticket := models.Ticket{
                                                TenantID:      order.TenantID,
                                                OrderID:       order.ID,
                                                TicketTypeID:  item.TicketTypeID,
                                                EventID:       order.EventID,
                                                TicketCode:    ticketCode,
                                                AttendeeName:  attendeeName,
                                                AttendeeEmail: attendeeEmail,
                                                QrData:        qrData,
                                                EventTitle:    order.Event.Title,
                                                TicketTypeName: ticketType.Name,
                                                Status:        "active",
                                                SeatLabel:     seatLabel,
                                        }
                                        if err := tx.Create(&ticket).Error; err != nil {
                                                tx.Rollback()
                                                return fmt.Errorf("failed to create ticket: %w", err)
                                        }
                                }
                        }
                        log.Printf("[Order] Created tickets for order %s", order.OrderCode)
                }

        case "deny", "cancel":
                if err := tx.Model(&order).Updates(map[string]interface{}{
                        "status":       "cancelled",
                        "payment_type": paymentType,
                }).Error; err != nil {
                        tx.Rollback()
                        return fmt.Errorf("failed to update order status to cancelled: %w", err)
                }
                // Update any pending tickets to cancelled
                tx.Model(&models.Ticket{}).
                        Where("order_id = ? AND status = ?", order.ID, "pending").
                        Update("status", "cancelled")
                // Restore ticket type sold counts
                for _, item := range order.Items {
                        tx.Model(&models.TicketType{}).Where("id = ?", item.TicketTypeID).
                                Update("sold", gorm.Expr("GREATEST(sold - ?, 0)", item.Quantity))
                }

        case "expire":
                if err := tx.Model(&order).Updates(map[string]interface{}{
                        "status":       "expired",
                        "payment_type": paymentType,
                }).Error; err != nil {
                        tx.Rollback()
                        return fmt.Errorf("failed to update order status to expired: %w", err)
                }
                // Update any pending tickets to expired
                tx.Model(&models.Ticket{}).
                        Where("order_id = ? AND status = ?", order.ID, "pending").
                        Update("status", "expired")
                // Restore ticket type sold counts
                for _, item := range order.Items {
                        tx.Model(&models.TicketType{}).Where("id = ?", item.TicketTypeID).
                                Update("sold", gorm.Expr("GREATEST(sold - ?, 0)", item.Quantity))
                }

        case "pending":
                // Still pending, just update payment type
                if err := tx.Model(&order).Updates(map[string]interface{}{
                        "payment_type": paymentType,
                }).Error; err != nil {
                        tx.Rollback()
                        return fmt.Errorf("failed to update order payment type: %w", err)
                }

        default:
                // Unknown status, log but don't error
                log.Printf("[Order] Unknown transaction status: %s for order %s", transactionStatus, order.OrderCode)
        }

        if err := tx.Commit().Error; err != nil {
                return fmt.Errorf("failed to commit payment callback transaction: %w", err)
        }

        return nil
}

// GetOrderByID retrieves an order by its ID with all relations.
func (s *OrderService) GetOrderByID(orderID string) (*models.Order, error) {
        var order models.Order
        if err := s.DB.Preload("Items").Preload("Items.TicketType").Preload("Tickets").Preload("Event").
                Where("id = ?", orderID).First(&order).Error; err != nil {
                return nil, fmt.Errorf("order not found: %w", err)
        }
        return &order, nil
}

// GetOrdersByUser retrieves all orders for a user.
func (s *OrderService) GetOrdersByUser(userID string) ([]models.Order, error) {
        var orders []models.Order
        if err := s.DB.Preload("Items").Preload("Items.TicketType").Preload("Event").
                Where("user_id = ?", userID).Order("created_at DESC").Find(&orders).Error; err != nil {
                return nil, fmt.Errorf("failed to get orders: %w", err)
        }
        return orders, nil
}

// CancelOrder cancels an order. Only pending orders can be cancelled.
func (s *OrderService) CancelOrder(orderID string, userID string) error {
        var order models.Order
        if err := s.DB.Preload("Items").Where("id = ? AND user_id = ?", orderID, userID).First(&order).Error; err != nil {
                return fmt.Errorf("order not found: %w", err)
        }

        if order.Status != "pending" {
                return fmt.Errorf("only pending orders can be cancelled (current: %s)", order.Status)
        }

        tx := s.DB.Begin()
        defer func() {
                if r := recover(); r != nil {
                        tx.Rollback()
                }
        }()

        if err := tx.Model(&order).Updates(map[string]interface{}{
                "status": "cancelled",
        }).Error; err != nil {
                tx.Rollback()
                return fmt.Errorf("failed to cancel order: %w", err)
        }

        // Restore ticket type sold counts
        for _, item := range order.Items {
                if err := tx.Model(&models.TicketType{}).Where("id = ?", item.TicketTypeID).
                        Update("sold", gorm.Expr("GREATEST(sold - ?, 0)", item.Quantity)).Error; err != nil {
                        tx.Rollback()
                        return fmt.Errorf("failed to restore ticket type sold count: %w", err)
                }
        }

        // Also try to cancel at Midtrans
        paymentService := NewPaymentService()
        _ = paymentService.CancelTransaction(order.OrderCode) // best effort, ignore error

        if err := tx.Commit().Error; err != nil {
                return fmt.Errorf("failed to commit order cancellation: %w", err)
        }

        return nil
}

// GetOrderByCode retrieves an order by its order code.
func (s *OrderService) GetOrderByCode(orderCode string) (*models.Order, error) {
        var order models.Order
        if err := s.DB.Preload("Items").Preload("Items.TicketType").Preload("Tickets").
                Where("order_code = ?", orderCode).First(&order).Error; err != nil {
                return nil, fmt.Errorf("order not found: %w", err)
        }
        return &order, nil
}
