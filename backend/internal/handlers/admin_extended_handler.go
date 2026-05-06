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

// ─── ADMIN ORGANIZERS ─────────────────────────────────────────────────────

// GetAdminOrganizers handles GET /api/v1/admin/organizers
func GetAdminOrganizers(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
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

                var organizers []models.Organizer
                var total int64

                query := db.Model(&models.Organizer{})
                if status != "" {
                        query = query.Where("status = ?", status)
                }

                query.Count(&total)
                err := query.
                        Preload("User").
                        Preload("FeeConfig").
                        Preload("BankAccounts").
                        Order("created_at DESC").
                        Limit(perPage).
                        Offset(offset).
                        Find(&organizers).Error

                if err != nil {
                        return response.InternalError(c, "Failed to retrieve organizers")
                }

                return response.Paginated(c, organizers, total, page, perPage)
        }
}

// ApproveOrganizer handles PATCH /api/v1/admin/organizers/:id/approve
func ApproveOrganizer(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID := c.Params("id")
                if organizerID == "" {
                        return response.BadRequest(c, "Organizer ID is required")
                }

                var organizer models.Organizer
                if err := db.Where("id = ?", organizerID).First(&organizer).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Organizer not found")
                        }
                        return response.InternalError(c, "Failed to retrieve organizer")
                }

                if organizer.Status == "approved" {
                        return response.BadRequest(c, "Organizer is already approved")
                }

                if err := db.Model(&organizer).Update("status", "approved").Error; err != nil {
                        return response.InternalError(c, "Failed to approve organizer")
                }

                // Also update user role to ORGANIZER if not already
                var user models.User
                if db.Where("id = ?", organizer.UserID).First(&user).Error == nil {
                        if user.Role != "ORGANIZER" && user.Role != "ADMIN" && user.Role != "SUPER_ADMIN" {
                                db.Model(&user).Update("role", "ORGANIZER")
                        }
                }

                return response.Success(c, "Organizer approved successfully", fiber.Map{
                        "organizerId": organizerID,
                        "status":      "approved",
                })
        }
}

// RejectOrganizer handles PATCH /api/v1/admin/organizers/:id/reject
func RejectOrganizer(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID := c.Params("id")
                if organizerID == "" {
                        return response.BadRequest(c, "Organizer ID is required")
                }

                type rejectReq struct {
                        Reason string `json:"reason"`
                }

                var req rejectReq
                _ = c.Bind().Body(&req) // Optional body

                var organizer models.Organizer
                if err := db.Where("id = ?", organizerID).First(&organizer).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Organizer not found")
                        }
                        return response.InternalError(c, "Failed to retrieve organizer")
                }

                if err := db.Model(&organizer).Update("status", "rejected").Error; err != nil {
                        return response.InternalError(c, "Failed to reject organizer")
                }

                return response.Success(c, "Organizer rejected successfully", fiber.Map{
                        "organizerId": organizerID,
                        "status":      "rejected",
                })
        }
}

// ─── ADMIN WITHDRAWALS ────────────────────────────────────────────────────

// GetAdminWithdrawals handles GET /api/v1/admin/withdrawals
func GetAdminWithdrawals(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
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

                query := db.Model(&models.WithdrawalRequest{})
                if status != "" {
                        query = query.Where("status = ?", status)
                }

                query.Count(&total)
                err := query.
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

// ApproveWithdrawal handles PATCH /api/v1/admin/withdrawals/:id/approve
func ApproveWithdrawal(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                withdrawalID := c.Params("id")
                if withdrawalID == "" {
                        return response.BadRequest(c, "Withdrawal ID is required")
                }

                type approveReq struct {
                        Method string `json:"method"` // AUTO_DOKU or MANUAL
                }

                var req approveReq
                _ = c.Bind().Body(&req) // Optional body

                method := req.Method
                if method == "" {
                        method = "MANUAL"
                }
                if method != "AUTO_DOKU" && method != "MANUAL" {
                        return response.BadRequest(c, "Method must be AUTO_DOKU or MANUAL")
                }

                var withdrawal models.WithdrawalRequest
                if err := db.Where("id = ?", withdrawalID).First(&withdrawal).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Withdrawal not found")
                        }
                        return response.InternalError(c, "Failed to retrieve withdrawal")
                }

                if withdrawal.Status != "pending" {
                        return response.BadRequest(c, "Only pending withdrawals can be approved")
                }

                now := time.Now()
                adminID, _ := c.Locals("userID").(string)
                updates := map[string]any{
                        "status":      "approved",
                        "method":      method,
                        "approved_at": now,
                        "approved_by": adminID,
                }

                if method == "AUTO_DOKU" {
                        // In a real implementation, this would trigger the DOKU disbursement API
                        // For now, mark as processing
                        updates["status"] = "processing"
                }

                if err := db.Model(&withdrawal).Updates(updates).Error; err != nil {
                        return response.InternalError(c, "Failed to approve withdrawal")
                }

                return response.Success(c, "Withdrawal approved successfully", fiber.Map{
                        "withdrawalId": withdrawalID,
                        "status":       updates["status"],
                        "method":       method,
                })
        }
}

// RejectWithdrawal handles PATCH /api/v1/admin/withdrawals/:id/reject
func RejectWithdrawal(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                withdrawalID := c.Params("id")
                if withdrawalID == "" {
                        return response.BadRequest(c, "Withdrawal ID is required")
                }

                type rejectReq struct {
                        Reason string `json:"reason"`
                }

                var req rejectReq
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                var withdrawal models.WithdrawalRequest
                if err := db.Where("id = ?", withdrawalID).First(&withdrawal).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Withdrawal not found")
                        }
                        return response.InternalError(c, "Failed to retrieve withdrawal")
                }

                if withdrawal.Status != "pending" && withdrawal.Status != "approved" {
                        return response.BadRequest(c, "Only pending or approved withdrawals can be rejected")
                }

                adminID, _ := c.Locals("userID").(string)
                now := time.Now()
                updates := map[string]any{
                        "status":          "rejected",
                        "rejected_at":     now,
                        "rejected_by":     adminID,
                        "rejected_reason": req.Reason,
                }

                if err := db.Model(&withdrawal).Updates(updates).Error; err != nil {
                        return response.InternalError(c, "Failed to reject withdrawal")
                }

                return response.Success(c, "Withdrawal rejected successfully", fiber.Map{
                        "withdrawalId": withdrawalID,
                        "status":       "rejected",
                })
        }
}

// UploadTransferProof handles POST /api/v1/admin/withdrawals/:id/proof
func UploadTransferProof(db *gorm.DB) fiber.Handler {
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

                if withdrawal.Method != "MANUAL" {
                        return response.BadRequest(c, "Transfer proof can only be uploaded for MANUAL method withdrawals")
                }

                // Parse multipart form
                file, err := c.FormFile("file")
                if err != nil {
                        return response.BadRequest(c, "File is required")
                }

                // In production, upload to S3/cloud storage. For now, store a placeholder path.
                proofPath := fmt.Sprintf("/uploads/transfer-proofs/%s_%s", withdrawalID, file.Filename)

                note := c.FormValue("note")

                now := time.Now()
                updates := map[string]any{
                        "transfer_proof": proofPath,
                        "status":         "completed",
                        "completed_at":   now,
                        "transferred_at": now,
                }
                if note != "" {
                        updates["transfer_note"] = note
                }

                if err := db.Model(&withdrawal).Updates(updates).Error; err != nil {
                        return response.InternalError(c, "Failed to update transfer proof")
                }

                return response.Success(c, "Transfer proof uploaded successfully", fiber.Map{
                        "withdrawalId":  withdrawalID,
                        "transferProof": proofPath,
                        "status":        "completed",
                })
        }
}

// NOTE: CheckDokuDisbursement is now implemented in doku_handler.go
// with full DOKU SNAP API integration (calls DokuService.CheckDisbursementStatus).

// ─── ADMIN PAYMENT LOGS ───────────────────────────────────────────────────

// GetAdminPaymentLogs handles GET /api/v1/admin/payment-logs
func GetAdminPaymentLogs(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                page, _ := strconv.Atoi(c.Query("page", "1"))
                perPage, _ := strconv.Atoi(c.Query("perPage", "20"))
                eventID := c.Query("eventId")

                if page < 1 {
                        page = 1
                }
                if perPage < 1 || perPage > 100 {
                        perPage = 20
                }
                offset := (page - 1) * perPage

                var paymentLogs []models.PaymentLog
                var total int64

                query := db.Model(&models.PaymentLog{})
                if eventID != "" {
                        query = query.Where("event_id = ?", eventID)
                }

                query.Count(&total)
                err := query.
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

// ─── ADMIN REFUNDS ────────────────────────────────────────────────────────

// GetAdminRefunds handles GET /api/v1/admin/refunds
func GetAdminRefunds(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                page, _ := strconv.Atoi(c.Query("page", "1"))
                perPage, _ := strconv.Atoi(c.Query("perPage", "20"))
                status := c.Query("status")
                organizerID := c.Query("organizerId")

                if page < 1 {
                        page = 1
                }
                if perPage < 1 || perPage > 100 {
                        perPage = 20
                }
                offset := (page - 1) * perPage

                var refunds []models.Refund
                var total int64

                query := db.Model(&models.Refund{})
                if status != "" {
                        query = query.Where("status = ?", status)
                }
                if organizerID != "" {
                        query = query.Where("organizer_id = ?", organizerID)
                }

                query.Count(&total)
                err := query.
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

// ApproveRefund handles PATCH /api/v1/admin/refunds/:id/approve
func ApproveRefund(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                refundID := c.Params("id")
                if refundID == "" {
                        return response.BadRequest(c, "Refund ID is required")
                }

                var refund models.Refund
                if err := db.Where("id = ?", refundID).First(&refund).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Refund not found")
                        }
                        return response.InternalError(c, "Failed to retrieve refund")
                }

                if refund.Status != "pending" {
                        return response.BadRequest(c, "Only pending refunds can be approved")
                }

                now := time.Now()
                if err := db.Model(&refund).Updates(map[string]any{
                        "status":       "approved",
                        "processed_at": now,
                }).Error; err != nil {
                        return response.InternalError(c, "Failed to approve refund")
                }

                return response.Success(c, "Refund approved successfully", fiber.Map{
                        "refundId": refundID,
                        "status":   "approved",
                })
        }
}

// RejectRefund handles PATCH /api/v1/admin/refunds/:id/reject
func RejectRefund(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                refundID := c.Params("id")
                if refundID == "" {
                        return response.BadRequest(c, "Refund ID is required")
                }

                type rejectReq struct {
                        Reason string `json:"reason"`
                }

                var req rejectReq
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                var refund models.Refund
                if err := db.Where("id = ?", refundID).First(&refund).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Refund not found")
                        }
                        return response.InternalError(c, "Failed to retrieve refund")
                }

                if refund.Status != "pending" {
                        return response.BadRequest(c, "Only pending refunds can be rejected")
                }

                if err := db.Model(&refund).Updates(map[string]any{
                        "status":           "rejected",
                        "rejection_reason": req.Reason,
                }).Error; err != nil {
                        return response.InternalError(c, "Failed to reject refund")
                }

                return response.Success(c, "Refund rejected successfully", fiber.Map{
                        "refundId": refundID,
                        "status":   "rejected",
                })
        }
}

// ─── ADMIN ORGANIZER FEE MANAGEMENT ───────────────────────────────────────

// GetOrganizerFee handles GET /api/v1/admin/organizers/:id/fee
// Returns the fee config for an organizer, or null if not set.
func GetOrganizerFee(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID := c.Params("id")
                if organizerID == "" {
                        return response.BadRequest(c, "Organizer ID is required")
                }

                // Verify organizer exists
                var organizer models.Organizer
                if err := db.Where("id = ?", organizerID).First(&organizer).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Organizer not found")
                        }
                        return response.InternalError(c, "Failed to retrieve organizer")
                }

                feeConfig, err := services.GetOrganizerFeeConfig(db, organizerID)
                if err != nil {
                        return response.InternalError(c, "Failed to retrieve fee config")
                }

                return response.OK(c, fiber.Map{
                        "feeConfig": feeConfig, // nil if not set
                })
        }
}

// SetOrganizerFee handles PATCH /api/v1/admin/organizers/:id/fee
// Creates or updates the fee config for an organizer.
// Accepts both { fee } (from FE) and { feePercent, isApproved } (from spec).
func SetOrganizerFee(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID := c.Params("id")
                if organizerID == "" {
                        return response.BadRequest(c, "Organizer ID is required")
                }

                // Verify organizer exists
                var organizer models.Organizer
                if err := db.Where("id = ?", organizerID).First(&organizer).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Organizer not found")
                        }
                        return response.InternalError(c, "Failed to retrieve organizer")
                }

                type setFeeReq struct {
                        FeePercent *float64 `json:"feePercent"` // spec name
                        Fee        *float64 `json:"fee"`        // FE sends this
                        IsApproved *bool    `json:"isApproved"`
                }

                var req setFeeReq
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                // Resolve feePercent: support both "feePercent" and "fee" field names
                var feePercent float64
                if req.FeePercent != nil {
                        feePercent = *req.FeePercent
                } else if req.Fee != nil {
                        feePercent = *req.Fee
                } else {
                        return response.BadRequest(c, "feePercent or fee is required")
                }

                if feePercent < 0 || feePercent > 100 {
                        return response.BadRequest(c, "feePercent must be between 0 and 100")
                }

                // Default isApproved to false if not specified
                isApproved := false
                if req.IsApproved != nil {
                        isApproved = *req.IsApproved
                }

                feeConfig, err := services.SetOrganizerFeeConfig(db, organizerID, feePercent, isApproved)
                if err != nil {
                        return response.InternalError(c, "Failed to set organizer fee config")
                }

                return response.Success(c, "Organizer fee updated successfully", fiber.Map{
                        "feeConfig": feeConfig,
                })
        }
}

// ApproveOrganizerFee handles PATCH /api/v1/admin/organizers/:id/fee/approve
// Approves or rejects an organizer's fee config.
func ApproveOrganizerFee(db *gorm.DB) fiber.Handler {
        return func(c fiber.Ctx) error {
                organizerID := c.Params("id")
                if organizerID == "" {
                        return response.BadRequest(c, "Organizer ID is required")
                }

                // Verify organizer exists
                var organizer models.Organizer
                if err := db.Where("id = ?", organizerID).First(&organizer).Error; err != nil {
                        if err == gorm.ErrRecordNotFound {
                                return response.NotFound(c, "Organizer not found")
                        }
                        return response.InternalError(c, "Failed to retrieve organizer")
                }

                type approveFeeReq struct {
                        IsApproved bool `json:"isApproved"`
                }

                var req approveFeeReq
                if err := c.Bind().Body(&req); err != nil {
                        return response.BadRequest(c, "Invalid request body")
                }

                feeConfig, err := services.ApproveOrganizerFee(db, organizerID, req.IsApproved)
                if err != nil {
                        return response.InternalError(c, "Failed to update fee approval status")
                }

                action := "approved"
                if !req.IsApproved {
                        action = "rejected"
                }

                return response.Success(c, fmt.Sprintf("Organizer fee %s successfully", action), fiber.Map{
                        "feeConfig": feeConfig,
                })
        }
}
