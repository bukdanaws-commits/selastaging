package handlers

import (
	"log"

	"github.com/bukdanaws-commits/seleevent/backend/internal/services"
	"github.com/bukdanaws-commits/seleevent/backend/pkg/response"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// ─── Payment Handler ─────────────────────────────────────────────────────────

// createPaymentRequest is the request body for creating a Snap payment.
type createPaymentRequest struct {
	OrderID          string   `json:"orderId"`                    // Internal order ID (UUID)
	PaymentType      string   `json:"paymentType,omitempty"`      // Optional: filter specific type ("snap" default)
	EnabledPayments  []string `json:"enabledPayments,omitempty"`  // Optional: restrict payment methods
}

// createDirectPaymentRequest is the request body for creating a direct charge payment (legacy).
type createDirectPaymentRequest struct {
	OrderID     string `json:"orderId"`
	PaymentType string `json:"paymentType"` // "qris", "bank_transfer", "gopay", "credit_card"
	Bank        string `json:"bank,omitempty"` // Optional: for bank_transfer (default: bca)
}

// CreatePayment handles POST /api/v1/payment/create
// Creates a Midtrans Snap transaction and returns snap_token for the frontend.
func CreatePayment(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(string)
		if !ok {
			return response.Unauthorized(c, "Not authenticated")
		}

		var req createPaymentRequest
		if err := c.BodyParser(&req); err != nil {
			return response.BadRequest(c, "Invalid request body")
		}

		if req.OrderID == "" {
			return response.BadRequest(c, "orderId is required")
		}

		// Get the order with items
		orderService := services.NewOrderService(db)
		order, err := orderService.GetOrderByID(req.OrderID)
		if err != nil {
			return response.NotFound(c, "Order not found")
		}

		// Verify the order belongs to the user
		if order.UserID != userID {
			return response.Forbidden(c, "You do not have access to this order")
		}

		// Only pending orders can be paid
		if order.Status != "pending" {
			return response.BadRequest(c, "Order is not in pending status")
		}

		// Check if order has expired
		if order.ExpiresAt != nil && order.ExpiresAt.Unix() < c.Context().Time().Unix() {
			return response.BadRequest(c, "Order has expired")
		}

		// Build item details for Midtrans
		var items []services.ItemDetail
		for _, item := range order.Items {
			items = append(items, services.ItemDetail{
				ID:       item.TicketTypeID,
				Price:    int64(item.PricePerTicket),
				Quantity: item.Quantity,
				Name:     item.TicketType.Name,
			})
		}

		// Get user info for customer details
		var user struct {
			Name  string `json:"name"`
			Email string `json:"email"`
			Phone string `json:"phone"`
		}
		db.Table("users").Where("id = ?", userID).Select("name, email, phone").Scan(&user)

		// Create Midtrans Snap transaction
		paymentService := services.NewPaymentService()

		var snapResp *services.SnapTransactionResponse
		if len(req.EnabledPayments) > 0 {
			snapResp, err = paymentService.CreateSnapTransactionWithPayments(
				order.OrderCode, int64(order.TotalAmount), user.Name, user.Email, items, req.EnabledPayments,
			)
		} else {
			snapResp, err = paymentService.CreateSnapTransaction(
				order.OrderCode, int64(order.TotalAmount), user.Name, user.Email, items,
			)
		}

		if err != nil {
			log.Printf("[Payment] Snap transaction creation failed: %v", err)
			return response.InternalError(c, "Failed to create payment: "+err.Error())
		}

		// Update order with payment method marker (snap)
		db.Model(order).Updates(map[string]interface{}{
			"payment_method": "snap",
		})

		log.Printf("[Payment] Snap transaction created: orderCode=%s token=%s", order.OrderCode, snapResp.Token)

		// Build response
		return response.OK(c, fiber.Map{
			"orderId":     order.OrderCode,
			"snapToken":   snapResp.Token,
			"redirectUrl": snapResp.RedirectURL,
			"clientKey":   paymentService.GetClientKey(),
			"isSandbox":   paymentService.IsSandboxMode(),
		})
	}
}

// CreateDirectPayment handles POST /api/v1/payment/create-direct
// Creates a direct charge payment (non-Snap) — useful for server-side payment flows.
func CreateDirectPayment(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(string)
		if !ok {
			return response.Unauthorized(c, "Not authenticated")
		}

		var req createDirectPaymentRequest
		if err := c.BodyParser(&req); err != nil {
			return response.BadRequest(c, "Invalid request body")
		}

		if req.OrderID == "" {
			return response.BadRequest(c, "orderId is required")
		}
		if req.PaymentType == "" {
			return response.BadRequest(c, "paymentType is required")
		}

		validTypes := map[string]bool{
			"qris": true, "bank_transfer": true, "gopay": true, "credit_card": true,
		}
		if !validTypes[req.PaymentType] {
			return response.BadRequest(c, "paymentType must be one of: qris, bank_transfer, gopay, credit_card")
		}

		// Get the order
		orderService := services.NewOrderService(db)
		order, err := orderService.GetOrderByID(req.OrderID)
		if err != nil {
			return response.NotFound(c, "Order not found")
		}

		// Verify the order belongs to the user
		if order.UserID != userID {
			return response.Forbidden(c, "You do not have access to this order")
		}

		// Only pending orders can be paid
		if order.Status != "pending" {
			return response.BadRequest(c, "Order is not in pending status")
		}

		// Check if order has expired
		if order.ExpiresAt != nil && order.ExpiresAt.Unix() < c.Context().Time().Unix() {
			return response.BadRequest(c, "Order has expired")
		}

		// Build item details for Midtrans
		var items []services.ItemDetail
		for _, item := range order.Items {
			items = append(items, services.ItemDetail{
				ID:       item.TicketTypeID,
				Price:    int64(item.PricePerTicket),
				Quantity: item.Quantity,
				Name:     item.TicketType.Name,
			})
		}

		// Get user info for customer details
		var user struct {
			Name  string `json:"name"`
			Email string `json:"email"`
		}
		db.Table("users").Where("id = ?", userID).Select("name, email").Scan(&user)

		// Create Midtrans transaction based on payment type
		paymentService := services.NewPaymentService()
		var midtransResp *services.CreateTransactionResponse

		switch req.PaymentType {
		case "qris":
			midtransResp, err = paymentService.CreateQRISTransaction(
				order.OrderCode, int64(order.TotalAmount), user.Name, user.Email, items,
			)
		case "bank_transfer":
			midtransResp, err = paymentService.CreateBankTransferTransaction(
				order.OrderCode, int64(order.TotalAmount), user.Name, user.Email, items, req.Bank,
			)
		case "gopay":
			midtransResp, err = paymentService.CreateGoPayTransaction(
				order.OrderCode, int64(order.TotalAmount), user.Name, user.Email, items,
			)
		case "credit_card":
			midtransResp, err = paymentService.CreateCreditCardTransaction(
				order.OrderCode, int64(order.TotalAmount), user.Name, user.Email, items,
			)
		}

		if err != nil {
			log.Printf("[Payment] Direct charge failed: %v", err)
			return response.InternalError(c, "Failed to create payment: "+err.Error())
		}

		// Update order with payment type
		paymentTypeStr := req.PaymentType
		midtransID := midtransResp.TransactionID
		db.Model(order).Updates(map[string]interface{}{
			"payment_type":            paymentTypeStr,
			"midtrans_transaction_id": midtransID,
		})

		// Build response data
		respData := fiber.Map{
			"orderId":           order.OrderCode,
			"transactionId":     midtransResp.TransactionID,
			"paymentType":       req.PaymentType,
			"grossAmount":       midtransResp.GrossAmount,
			"transactionStatus": midtransResp.TransactionStatus,
		}

		// Add payment-type-specific data
		switch req.PaymentType {
		case "qris":
			respData["qrString"] = midtransResp.QRString
			for _, action := range midtransResp.Actions {
				if action.Name == "generate-qr-code" {
					respData["qrUrl"] = action.URL
				}
			}
		case "bank_transfer":
			if len(midtransResp.VANumbers) > 0 {
				respData["vaNumber"] = midtransResp.VANumbers[0].VANumber
				respData["bank"] = midtransResp.VANumbers[0].Bank
			}
		case "gopay":
			respData["actions"] = midtransResp.Actions
			for _, action := range midtransResp.Actions {
				if action.Name == "deeplink-redirect" {
					respData["redirectUrl"] = action.URL
				}
			}
		case "credit_card":
			respData["redirectUrl"] = midtransResp.RedirectURL
		}

		return response.OK(c, respData)
	}
}

// PaymentNotification handles POST /api/v1/payment/notification
// This is the Midtrans webhook notification endpoint (NO AUTH — called by Midtrans servers).
// It verifies the signature and updates the order status accordingly.
func PaymentNotification(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		payload := c.Body()

		paymentService := services.NewPaymentService()
		notif, err := paymentService.HandleNotification(payload)
		if err != nil {
			log.Printf("[Payment] Notification verification failed: %v", err)
			// Still return 200 to prevent Midtrans from retrying indefinitely
			return c.JSON(fiber.Map{
				"success": false,
				"message": "Notification verification failed",
			})
		}

		log.Printf("[Payment] Notification received: orderID=%s status=%s paymentType=%s",
			notif.OrderID, notif.TransactionStatus, notif.PaymentType)

		// Process the payment notification
		orderService := services.NewOrderService(db)
		if err := orderService.ProcessPaymentCallback(
			notif.OrderID,
			notif.PaymentType,
			notif.TransactionStatus,
			notif.TransactionID,
		); err != nil {
			log.Printf("[Payment] Failed to process notification: %v", err)
			// Still return 200 to prevent Midtrans from retrying
			return c.JSON(fiber.Map{
				"success": false,
				"message": "Failed to process notification: " + err.Error(),
			})
		}

		log.Printf("[Payment] Notification processed successfully: orderID=%s status=%s",
			notif.OrderID, notif.TransactionStatus)

		// Always return 200 to Midtrans to acknowledge receipt
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Notification processed",
		})
	}
}

// PaymentCallback handles POST /api/v1/payment/callback
// Legacy alias for PaymentNotification (kept for backward compatibility).
func PaymentCallback(db *gorm.DB) fiber.Handler {
	return PaymentNotification(db)
}

// GetPaymentStatus handles GET /api/v1/payment/status/:orderId
// Checks payment status from Midtrans and updates local order.
func GetPaymentStatus(db *gorm.DB) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID, ok := c.Locals("userID").(string)
		if !ok {
			return response.Unauthorized(c, "Not authenticated")
		}

		orderID := c.Params("orderId")
		if orderID == "" {
			return response.BadRequest(c, "orderId is required")
		}

		// Get the order — support both UUID and order code
		orderService := services.NewOrderService(db)
		order, err := orderService.GetOrderByID(orderID)
		if err != nil {
			// Try by order code
			order, err = orderService.GetOrderByCode(orderID)
			if err != nil {
				return response.NotFound(c, "Order not found")
			}
		}

		// Verify the order belongs to the user
		if order.UserID != userID {
			return response.Forbidden(c, "You do not have access to this order")
		}

		// Check Midtrans status
		paymentService := services.NewPaymentService()
		midtransStatus, err := paymentService.CheckTransactionStatus(order.OrderCode)
		if err != nil {
			// Return local status if Midtrans check fails
			log.Printf("[Payment] Midtrans status check failed: %v", err)
			return response.OK(c, fiber.Map{
				"orderId":     order.OrderCode,
				"orderStatus": order.Status,
				"paymentType": order.PaymentType,
				"paidAt":      order.PaidAt,
				"source":      "local",
			})
		}

		// If Midtrans status differs from local, sync it
		if shouldSyncStatus(order.Status, midtransStatus.TransactionStatus) {
			log.Printf("[Payment] Syncing status: local=%s midtrans=%s orderCode=%s",
				order.Status, midtransStatus.TransactionStatus, order.OrderCode)

			orderService.ProcessPaymentCallback(
				order.OrderCode,
				midtransStatus.PaymentType,
				midtransStatus.TransactionStatus,
				midtransStatus.TransactionID,
			)
		}

		return response.OK(c, fiber.Map{
			"orderId":          order.OrderCode,
			"orderStatus":     midtransStatus.TransactionStatus,
			"paymentType":     midtransStatus.PaymentType,
			"transactionId":   midtransStatus.TransactionID,
			"grossAmount":     midtransStatus.GrossAmount,
			"transactionTime": midtransStatus.TransactionTime,
			"settlementTime":  midtransStatus.SettlementTime,
			"fraudStatus":     midtransStatus.FraudStatus,
			"source":          "midtrans",
		})
	}
}

// shouldSyncStatus determines if local order status should be synced with Midtrans.
func shouldSyncStatus(localStatus, midtransStatus string) bool {
	// Don't sync if already in terminal state
	if localStatus == "cancelled" || localStatus == "expired" {
		return false
	}
	// Sync if Midtrans reports a paid/settled state but local is still pending
	if (midtransStatus == "capture" || midtransStatus == "settlement") && localStatus == "pending" {
		return true
	}
	// Sync if Midtrans reports cancel/expire/deny
	if (midtransStatus == "cancel" || midtransStatus == "expire" || midtransStatus == "deny") && localStatus == "pending" {
		return true
	}
	return false
}
