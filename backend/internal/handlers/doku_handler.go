package handlers

// ─── DOKU Payment Handlers ────────────────────────────────────────────────
// Replaces the Midtrans payment handlers with DOKU SNAP API integration.
// ──────────────────────────────────────────────────────────────────────────

import (
        "fmt"
        "log"
        "strings"
        "time"

        "github.com/bukdanaws-commits/seleevent/backend/internal/models"
        "github.com/bukdanaws-commits/seleevent/backend/internal/services"
        "github.com/bukdanaws-commits/seleevent/backend/pkg/response"
        "github.com/gofiber/fiber/v3"
        "gorm.io/gorm"
)

// ─── Request Types ────────────────────────────────────────────────────────

// dokuCreatePaymentRequest is the request body for creating a DOKU payment.
type dokuCreatePaymentRequest struct {
        OrderID       string `json:"orderId"`                    // Internal order ID (UUID)
        PaymentMethod string `json:"paymentMethod,omitempty"`    // DOKU payment method (e.g. VIRTUAL_ACCOUNT_BCA, QRIS, DOKU_CHECKOUT)
        PaymentType   string `json:"paymentType,omitempty"`      // Payment type category (virtual_account, qris, ewallet, credit_card, checkout)
}

// dokuDisburseRequest is the request body for initiating a DOKU disbursement.
type dokuDisburseRequest struct {
        WithdrawalID  string  `json:"withdrawalId"`
        Amount        float64 `json:"amount"`
        BankName      string  `json:"bankName"`
        AccountNumber string  `json:"accountNumber"`
        AccountHolder string  `json:"accountHolder"`
        ReferenceNo   string  `json:"referenceNo,omitempty"`
}

// ─── DokuCreatePayment handles POST /api/v1/doku/create ───────────────────

func DokuCreatePayment(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                userID, ok := c.Locals("userID").(string)
                if !ok {
                        return response.Unauthorized(c, "Not authenticated")
                }

                var req dokuCreatePaymentRequest
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                if req.OrderID == "" {
                        return response.BadRequest(c, "orderId is required")
                }

                if req.PaymentMethod == "" && req.PaymentType == "" {
                        // Default to DOKU Checkout if no method specified
                        req.PaymentMethod = services.DokuPMCheckout
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
                if order.ExpiresAt != nil && order.ExpiresAt.Unix() < time.Now().Unix() {
                        return response.BadRequest(c, "Order has expired")
                }

                // Build item details for DOKU
                var items []services.DokuItemDetail
                for _, item := range order.Items {
                        items = append(items, services.DokuItemDetail{
                                ID:       item.TicketTypeID,
                                Price:    float64(item.PricePerTicket),
                                Quantity: item.Quantity,
                                Name:     item.TicketType.Name,
                        })
                }

                // Get user info for customer details
                var user struct {
                        Name  string  `json:"name"`
                        Email string  `json:"email"`
                        Phone *string `json:"phone"`
                }
                db.Table("users").Where("id = ?", userID).Select("name, email, phone").Scan(&user)

                customerPhone := ""
                if user.Phone != nil {
                        customerPhone = *user.Phone
                }

                // Create DOKU payment
                dokuService := services.NewDokuService()

                dokuReq := services.DokuCreatePaymentRequest{
                        OrderID:       order.OrderCode,
                        Amount:        float64(order.TotalAmount),
                        PaymentType:   req.PaymentType,
                        PaymentMethod: req.PaymentMethod,
                        CustomerName:  user.Name,
                        CustomerEmail: user.Email,
                        CustomerPhone: customerPhone,
                        ItemDetails:   items,
                }

                dokuResp, err := dokuService.CreatePayment(dokuReq)
                if err != nil {
                        log.Printf("[DOKU] Payment creation failed: %v", err)
                        return response.InternalError(c, "Failed to create payment: "+err.Error())
                }

                // Update order with DOKU transaction ID and payment method marker
                paymentMethodStr := req.PaymentMethod
                if paymentMethodStr == "" {
                        paymentMethodStr = req.PaymentType
                }
                paymentTxID := dokuResp.TransactionID
                db.Model(order).Updates(map[string]any{
                        "payment_method":          "doku",
                        "payment_type":            paymentMethodStr,
                        "payment_transaction_id": paymentTxID,
                })

                log.Printf("[DOKU] Payment created: orderCode=%s method=%s txID=%s",
                        order.OrderCode, paymentMethodStr, dokuResp.TransactionID)

                // Build response
                respData := fiber.Map{
                        "orderId":       order.OrderCode,
                        "transactionId": dokuResp.TransactionID,
                        "paymentMethod": dokuResp.PaymentMethod,
                        "expiresAt":     dokuResp.ExpiresAt,
                        "isSandbox":     dokuService.IsSandbox,
                }

                // Add method-specific response fields
                if dokuResp.PaymentURL != "" {
                        respData["paymentUrl"] = dokuResp.PaymentURL
                }
                if dokuResp.VANumber != "" {
                        respData["vaNumber"] = dokuResp.VANumber
                }
                if dokuResp.QRContent != "" {
                        respData["qrContent"] = dokuResp.QRContent
                }

                return response.OK(c, respData)
        }
}

// ─── DokuNotification handles POST /api/v1/payment/notification (DOKU webhook) ─

func DokuNotification(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                payload := c.Body()

                // Get signature headers for verification
                xSignature := c.Get("X-Signature")
                xTimestamp := c.Get("X-Timestamp")

                dokuService := services.NewDokuService()

                var notif *services.DokuNotificationPayload
                var err error

                // Verify signature if headers are present
                if xSignature != "" && xTimestamp != "" {
                        notif, err = dokuService.HandleNotificationWithVerification(xTimestamp, xSignature, payload)
                } else {
                        // Process without verification (for testing / non-SNAP notifications)
                        notif, err = dokuService.HandleNotification(payload)
                }

                if err != nil {
                        log.Printf("[DOKU] Notification verification failed: %v", err)
                        // Still return 200 to prevent DOKU from retrying indefinitely
                        return c.JSON(fiber.Map{
                                "success": false,
                                "message": "Notification verification failed",
                        })
                }

                log.Printf("[DOKU] Notification received: orderID=%s status=%s paymentType=%s channel=%s",
                        notif.OrderID, notif.Status, notif.PaymentType, notif.PaymentChannel)

                // Process the payment notification using the existing order service
                // The DOKU status is already normalized to Midtrans-compatible values
                // by the doku_service (settlement, cancel, expire, pending)
                orderService := services.NewOrderService(db)
                if err := orderService.ProcessPaymentCallback(
                        notif.OrderID,
                        notif.PaymentType,
                        notif.Status,
                        notif.TransactionID,
                ); err != nil {
                        log.Printf("[DOKU] Failed to process notification: %v", err)
                        // Still return 200 to prevent DOKU from retrying
                        return c.JSON(fiber.Map{
                                "success": false,
                                "message": "Failed to process notification: " + err.Error(),
                        })
                }

                // Create PaymentLog entry for the notification
                if notif.OrderID != "" {
                        createDokuPaymentLog(db, notif, payload)
                }

                // Broadcast SSE event for real-time updates
                if notif.Status == "settlement" || notif.Status == "capture" {
                        broadcastPaymentSuccess(notif)
                }

                log.Printf("[DOKU] Notification processed successfully: orderID=%s status=%s",
                        notif.OrderID, notif.Status)

                // DOKU expects HTTP 200 with "OK" body to acknowledge receipt
                return c.SendString("OK")
        }
}

// createDokuPaymentLog creates a PaymentLog entry from a DOKU notification.
func createDokuPaymentLog(db *gorm.DB, notif *services.DokuNotificationPayload, rawPayload []byte) {
        // Look up the order by order code to get IDs
        var order models.Order
        if err := db.Where("order_code = ?", notif.OrderID).First(&order).Error; err != nil {
                log.Printf("[DOKU] Could not find order for payment log: orderCode=%s err=%v", notif.OrderID, err)
                return
        }

        paymentMethod := notif.PaymentType
        if notif.PaymentChannel != "" {
                paymentMethod = notif.PaymentChannel
        }

        rawData := string(rawPayload)

        paymentLog := models.PaymentLog{
                EventID:        order.EventID,
                OrderID:        order.ID,
                OrderCode:      order.OrderCode,
                TransactionID:  notif.TransactionID,
                PaymentMethod:  "doku",
                PaymentChannel: paymentMethod,
                Amount:         float64(order.TotalAmount),
                Currency:       "IDR",
                Status:         notif.Status,
                RawData:        &rawData,
        }

        if notif.PaidAt != "" {
                if paidAt, err := time.Parse(time.RFC3339, notif.PaidAt); err == nil {
                        paymentLog.PaidAt = &paidAt
                }
        }

        if err := db.Create(&paymentLog).Error; err != nil {
                log.Printf("[DOKU] Failed to create payment log for order %s: %v", order.OrderCode, err)
        } else {
                log.Printf("[DOKU] PaymentLog created: orderCode=%s status=%s", order.OrderCode, notif.Status)
        }
}

// broadcastPaymentSuccess sends an SSE event when a payment succeeds.
func broadcastPaymentSuccess(notif *services.DokuNotificationPayload) {
        if services.Hub != nil {
                services.Hub.Broadcast("payment_success", fiber.Map{
                        "orderCode":     notif.OrderID,
                        "transactionId": notif.TransactionID,
                        "status":        notif.Status,
                        "paymentType":   notif.PaymentType,
                        "amount":        notif.Amount,
                        "paidAt":        notif.PaidAt,
                })
                log.Printf("[DOKU] SSE payment_success broadcast sent for order %s", notif.OrderID)
        }
}

// ─── DokuCheckPayment handles GET /api/v1/doku/status/:orderId ────────────

func DokuCheckPayment(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
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

                // Check DOKU status
                dokuService := services.NewDokuService()
                dokuStatus, err := dokuService.CheckPaymentStatus(order.OrderCode)
                if err != nil {
                        // Return local status if DOKU check fails
                        log.Printf("[DOKU] Status check failed: %v", err)
                        return response.OK(c, fiber.Map{
                                "orderId":     order.OrderCode,
                                "orderStatus": order.Status,
                                "paymentType": order.PaymentType,
                                "paidAt":      order.PaidAt,
                                "source":      "local",
                        })
                }

                // If DOKU status differs from local, sync it
                if shouldSyncDokuStatus(order.Status, dokuStatus.Status) {
                        log.Printf("[DOKU] Syncing status: local=%s doku=%s orderCode=%s",
                                order.Status, dokuStatus.Status, order.OrderCode)

                        orderService.ProcessPaymentCallback(
                                order.OrderCode,
                                dokuStatus.PaymentType,
                                dokuStatus.Status,
                                dokuStatus.TransactionID,
                        )
                }

                return response.OK(c, fiber.Map{
                        "orderId":        order.OrderCode,
                        "orderStatus":   dokuStatus.Status,
                        "paymentType":   dokuStatus.PaymentType,
                        "transactionId": dokuStatus.TransactionID,
                        "paymentChannel": dokuStatus.PaymentChannel,
                        "amount":        dokuStatus.Amount,
                        "paidAt":        dokuStatus.PaidAt,
                        "source":        "doku",
                })
        }
}

// ─── DokuDisburse handles POST /api/v1/admin/withdrawals/disburse ──────────

func DokuDisburse(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                var req dokuDisburseRequest
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                if req.WithdrawalID == "" {
                        return response.BadRequest(c, "withdrawalId is required")
                }
                if req.Amount <= 0 {
                        return response.BadRequest(c, "amount must be greater than 0")
                }
                if req.BankName == "" {
                        return response.BadRequest(c, "bankName is required")
                }
                if req.AccountNumber == "" {
                        return response.BadRequest(c, "accountNumber is required")
                }
                if req.AccountHolder == "" {
                        return response.BadRequest(c, "accountHolder is required")
                }

                dokuService := services.NewDokuService()
                resp, err := dokuService.CreateDisbursement(services.DokuDisbursementRequest{
                        WithdrawalID:  req.WithdrawalID,
                        Amount:        req.Amount,
                        BankName:      req.BankName,
                        AccountNumber: req.AccountNumber,
                        AccountHolder: req.AccountHolder,
                        ReferenceNo:   req.ReferenceNo,
                })
                if err != nil {
                        log.Printf("[DOKU] Disbursement failed: %v", err)
                        return response.InternalError(c, "Failed to create disbursement: "+err.Error())
                }

                log.Printf("[DOKU] Disbursement created: withdrawalID=%s disbursementID=%s status=%s",
                        req.WithdrawalID, resp.DisbursementID, resp.Status)

                return response.OK(c, fiber.Map{
                        "disbursementId": resp.DisbursementID,
                        "referenceNo":    resp.ReferenceNo,
                        "status":         resp.Status,
                        "amount":         resp.Amount,
                })
        }
}

// ─── CheckDokuDisbursement handles POST /api/v1/admin/withdrawals/:id/check-doku ─
// This handler checks the DOKU disbursement status and updates the withdrawal record.

func CheckDokuDisbursement(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                withdrawalID := c.Params("id")
                if withdrawalID == "" {
                        return response.BadRequest(c, "Withdrawal ID is required")
                }

                var withdrawal models.WithdrawalRequest
                if err := db.Where("id = ?", withdrawalID).First(&withdrawal).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Withdrawal not found")
                        }
                        return response.InternalError(c, "Failed to retrieve withdrawal")
                }

                if withdrawal.Method != "AUTO_DOKU" {
                        return response.BadRequest(c, "DOKU check is only applicable for AUTO_DOKU method withdrawals")
                }

                // Get DOKU disbursement ID from the withdrawal record
                dokuDisbursementID := withdrawalID
                if withdrawal.DokuDisbursementID != nil && *withdrawal.DokuDisbursementID != "" {
                        dokuDisbursementID = *withdrawal.DokuDisbursementID
                }

                dokuService := services.NewDokuService()
                dokuResp, err := dokuService.CheckDisbursementStatus(dokuDisbursementID)
                if err != nil {
                        log.Printf("[DOKU] Disbursement status check failed for withdrawal %s: %v", withdrawalID, err)
                        // Return current local status if DOKU check fails
                        return response.OK(c, fiber.Map{
                                "withdrawalId": withdrawalID,
                                "status":      withdrawal.Status,
                                "dokuStatus":  "CHECK_FAILED",
                                "error":       err.Error(),
                                "source":      "local",
                        })
                }

                // Update withdrawal with DOKU status
                updates := map[string]any{
                        "doku_status": dokuResp.Status,
                }

                // Map DOKU disbursement status to withdrawal status
                newStatus := withdrawal.Status
                switch strings.ToUpper(dokuResp.Status) {
                case "COMPLETED", "SUCCESS":
                        newStatus = "completed"
                        now := time.Now()
                        updates["status"] = "completed"
                        updates["completed_at"] = now
                        updates["transferred_at"] = now
                case "FAILED", "REJECTED":
                        newStatus = "failed"
                        updates["status"] = "failed"
                        updates["failure_reason"] = fmt.Sprintf("DOKU disbursement %s", strings.ToLower(dokuResp.Status))
                case "PENDING", "PROCESSING":
                        // Still processing, no status change needed
                default:
                        // Unknown status, just update doku_status
                }

                if dokuResp.DisbursementID != "" {
                        updates["doku_disbursement_id"] = dokuResp.DisbursementID
                }
                if dokuResp.ReferenceNo != "" {
                        updates["doku_reference_no"] = dokuResp.ReferenceNo
                }

                if err := db.Model(&withdrawal).Updates(updates).Error; err != nil {
                        log.Printf("[DOKU] Failed to update withdrawal %s with DOKU status: %v", withdrawalID, err)
                }

                return response.OK(c, fiber.Map{
                        "withdrawalId":    withdrawalID,
                        "status":          newStatus,
                        "dokuStatus":      dokuResp.Status,
                        "disbursementId":  dokuResp.DisbursementID,
                        "referenceNo":     dokuResp.ReferenceNo,
                        "source":          "doku",
                })
        }
}

// ─── Helper ───────────────────────────────────────────────────────────────

// shouldSyncDokuStatus determines if local order status should be synced with DOKU.
func shouldSyncDokuStatus(localStatus, dokuStatus string) bool {
        // Don't sync if already in terminal state
        if localStatus == "cancelled" || localStatus == "expired" || localStatus == "paid" {
                return false
        }
        // Sync if DOKU reports a paid/settled state but local is still pending
        if (dokuStatus == "capture" || dokuStatus == "settlement") && localStatus == "pending" {
                return true
        }
        // Sync if DOKU reports cancel/expire/deny
        if (dokuStatus == "cancel" || dokuStatus == "expire" || dokuStatus == "deny") && localStatus == "pending" {
                return true
        }
        return false
}
