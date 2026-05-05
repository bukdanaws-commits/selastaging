package services

import (
        "bytes"
        "crypto/sha256"
        "crypto/sha512"
        "encoding/base64"
        "encoding/hex"
        "encoding/json"
        "fmt"
        "io"
        "net/http"
        "os"

        "github.com/bukdanaws-commits/seleevent/backend/internal/config"
)

// ─── Midtrans API Types ─────────────────────────────────────────────────────

// PaymentService handles Midtrans payment gateway integration.
type PaymentService struct {
        ServerKey   string
        ClientKey   string
        MerchantID  string
        IsSandbox   bool
        BaseURL     string // Core API base URL (for charge, status, cancel)
        SnapBaseURL string // Snap API base URL (for creating snap transactions)
}

// ItemDetail represents a line item sent to Midtrans.
type ItemDetail struct {
        ID       string `json:"id"`
        Price    int64  `json:"price"`
        Quantity int    `json:"quantity"`
        Name     string `json:"name"`
}

// CustomerDetail represents customer information for Midtrans.
type CustomerDetail struct {
        FirstName string `json:"first_name"`
        LastName  string `json:"last_name,omitempty"`
        Email     string `json:"email"`
        Phone     string `json:"phone,omitempty"`
}

// SnapTransactionRequest is the request body for creating a Snap transaction.
type SnapTransactionRequest struct {
        TransactionDetails TransactionDetails `json:"transaction_details"`
        ItemDetails        []ItemDetail       `json:"item_details"`
        CustomerDetails    CustomerDetail     `json:"customer_details"`
        EnabledPayments    []string           `json:"enabled_payments,omitempty"`
        Expiry             *ExpiryDetail      `json:"expiry,omitempty"`
}

// TransactionDetails holds order_id and gross_amount for Midtrans.
type TransactionDetails struct {
        OrderID     string `json:"order_id"`
        GrossAmount int64  `json:"gross_amount"`
}

// ExpiryDetail controls transaction expiry window.
type ExpiryDetail struct {
        Duration int    `json:"duration,omitempty"`
        Unit     string `json:"unit,omitempty"` // "minute", "hour", "day"
}

// SnapTransactionResponse is the Midtrans Snap API response.
type SnapTransactionResponse struct {
        Token       string `json:"token"`
        RedirectURL string `json:"redirect_url"`
}

// CreateTransactionResponse is the Midtrans response for a direct charge request.
type CreateTransactionResponse struct {
        TransactionID     string           `json:"transaction_id"`
        OrderID           string           `json:"order_id"`
        GrossAmount       string           `json:"gross_amount"`
        PaymentType       string           `json:"payment_type"`
        TransactionStatus string           `json:"transaction_status"`
        QRString          string           `json:"qr_string"`
        VANumbers         []VANumber       `json:"va_numbers"`
        Actions           []MidtransAction `json:"actions"`
        RedirectURL       string           `json:"redirect_url"`
}

// VANumber holds the virtual account details from Midtrans.
type VANumber struct {
        Bank     string `json:"bank"`
        VANumber string `json:"va_number"`
}

// MidtransAction represents an action URL from Midtrans (deeplink, QR, etc).
type MidtransAction struct {
        Name   string `json:"name"`
        URL    string `json:"url"`
        Method string `json:"method"`
}

// TransactionStatusResponse is the Midtrans response for a status check.
type TransactionStatusResponse struct {
        TransactionID     string     `json:"transaction_id"`
        OrderID           string     `json:"order_id"`
        GrossAmount       string     `json:"gross_amount"`
        PaymentType       string     `json:"payment_type"`
        TransactionStatus string     `json:"transaction_status"`
        TransactionTime   string     `json:"transaction_time"`
        SettlementTime    string     `json:"settlement_time,omitempty"`
        StatusMessage     string     `json:"status_message"`
        VANumbers         []VANumber `json:"va_numbers,omitempty"`
        FraudStatus       string     `json:"fraud_status,omitempty"`
}

// NotificationResponse is the parsed Midtrans webhook notification.
type NotificationResponse struct {
        TransactionID     string     `json:"transaction_id"`
        OrderID           string     `json:"order_id"`
        GrossAmount       string     `json:"gross_amount"`
        PaymentType       string     `json:"payment_type"`
        TransactionStatus string     `json:"transaction_status"`
        TransactionTime   string     `json:"transaction_time"`
        SettlementTime    string     `json:"settlement_time,omitempty"`
        FraudStatus       string     `json:"fraud_status,omitempty"`
        StatusMessage     string     `json:"status_message"`
        StatusCode        string     `json:"status_code"`
        SignatureKey      string     `json:"signature_key"`
        VANumbers         []VANumber `json:"va_numbers,omitempty"`
        PaymentAmounts    []struct {
                PaidAt  string `json:"paid_at"`
                Amount  string `json:"amount"`
        } `json:"payment_amounts,omitempty"`
}

// NewPaymentService creates a new PaymentService reading config from env vars
// and falling back to the config package.
func NewPaymentService() *PaymentService {
        isSandbox := os.Getenv("MIDTRANS_IS_SANDBOX") == "true"
        // Also check the config package if loaded
        if !isSandbox && config.Cfg.Midtrans.IsSandbox {
                isSandbox = true
        }

        baseURL := "https://api.midtrans.com"
        snapBaseURL := "https://app.midtrans.com"
        if isSandbox {
                baseURL = "https://api.sandbox.midtrans.com"
                snapBaseURL = "https://app.sandbox.midtrans.com"
        }

        serverKey := os.Getenv("MIDTRANS_SERVER_KEY")
        if serverKey == "" {
                serverKey = config.Cfg.Midtrans.ServerKey
        }
        clientKey := os.Getenv("MIDTRANS_CLIENT_KEY")
        if clientKey == "" {
                clientKey = config.Cfg.Midtrans.ClientKey
        }
        merchantID := os.Getenv("MIDTRANS_MERCHANT_ID")
        if merchantID == "" {
                merchantID = config.Cfg.Midtrans.MerchantID
        }

        return &PaymentService{
                ServerKey:   serverKey,
                ClientKey:   clientKey,
                MerchantID:  merchantID,
                IsSandbox:   isSandbox,
                BaseURL:     baseURL,
                SnapBaseURL: snapBaseURL,
        }
}

// authHeader returns the Basic Auth header value for Midtrans API calls.
// Midtrans expects Base64(serverKey:) — the server key as username with empty password.
func (s *PaymentService) authHeader() string {
        encoded := base64.StdEncoding.EncodeToString([]byte(s.ServerKey + ":"))
        return "Basic " + encoded
}

// makeRequest is a helper to make HTTP requests to the Midtrans Core API.
func (s *PaymentService) makeRequest(method, path string, body interface{}) ([]byte, int, error) {
        return makeHTTPRequest(method, s.BaseURL+path, s.authHeader(), body)
}

// makeSnapRequest is a helper to make HTTP requests to the Midtrans Snap API.
func (s *PaymentService) makeSnapRequest(method, path string, body interface{}) ([]byte, int, error) {
        return makeHTTPRequest(method, s.SnapBaseURL+path, s.authHeader(), body)
}

// makeHTTPRequest is a generic HTTP request helper with auth.
func makeHTTPRequest(method, url, auth string, body interface{}) ([]byte, int, error) {
        var reqBody io.Reader
        if body != nil {
                jsonData, err := json.Marshal(body)
                if err != nil {
                        return nil, 0, fmt.Errorf("failed to marshal request body: %w", err)
                }
                reqBody = bytes.NewBuffer(jsonData)
        }

        req, err := http.NewRequest(method, url, reqBody)
        if err != nil {
                return nil, 0, fmt.Errorf("failed to create request: %w", err)
        }

        req.Header.Set("Content-Type", "application/json")
        req.Header.Set("Accept", "application/json")
        req.Header.Set("Authorization", auth)

        client := &http.Client{}
        resp, err := client.Do(req)
        if err != nil {
                return nil, 0, fmt.Errorf("failed to send request: %w", err)
        }
        defer resp.Body.Close()

        respBody, err := io.ReadAll(resp.Body)
        if err != nil {
                return nil, resp.StatusCode, fmt.Errorf("failed to read response: %w", err)
        }

        return respBody, resp.StatusCode, nil
}

// ─── Snap Transaction (Primary Flow) ────────────────────────────────────────

// CreateSnapTransaction creates a Midtrans Snap transaction.
// This returns a snap_token that the frontend uses to open the Snap payment popup.
// All payment methods (QRIS, Gopay, Bank Transfer, Credit Card) are available in the popup.
func (s *PaymentService) CreateSnapTransaction(orderID string, grossAmount int64, customerName string, customerEmail string, items []ItemDetail) (*SnapTransactionResponse, error) {
        payload := SnapTransactionRequest{
                TransactionDetails: TransactionDetails{
                        OrderID:     orderID,
                        GrossAmount: grossAmount,
                },
                ItemDetails: items,
                CustomerDetails: CustomerDetail{
                        FirstName: customerName,
                        Email:     customerEmail,
                },
                // Enable all common payment methods
                EnabledPayments: []string{
                        "credit_card",
                        "gopay",
                        "qris",
                        "bca_va",
                        "bni_va",
                        "bri_va",
                        "mandiri_va",
                        "permata_va",
                        "other_va",
                },
                Expiry: &ExpiryDetail{
                        Duration: 30,
                        Unit:     "minute",
                },
        }

        respBody, statusCode, err := s.makeSnapRequest("POST", "/snap/v1/transactions", payload)
        if err != nil {
                return nil, fmt.Errorf("midtrans snap request failed: %w", err)
        }

        if statusCode != 200 && statusCode != 201 {
                return nil, fmt.Errorf("midtrans snap failed (status %d): %s", statusCode, string(respBody))
        }

        var result SnapTransactionResponse
        if err := json.Unmarshal(respBody, &result); err != nil {
                return nil, fmt.Errorf("failed to parse midtrans snap response: %w", err)
        }

        return &result, nil
}

// CreateSnapTransactionWithPayments creates a Snap transaction with specific enabled payments.
func (s *PaymentService) CreateSnapTransactionWithPayments(orderID string, grossAmount int64, customerName string, customerEmail string, items []ItemDetail, enabledPayments []string) (*SnapTransactionResponse, error) {
        payload := SnapTransactionRequest{
                TransactionDetails: TransactionDetails{
                        OrderID:     orderID,
                        GrossAmount: grossAmount,
                },
                ItemDetails: items,
                CustomerDetails: CustomerDetail{
                        FirstName: customerName,
                        Email:     customerEmail,
                },
                EnabledPayments: enabledPayments,
                Expiry: &ExpiryDetail{
                        Duration: 30,
                        Unit:     "minute",
                },
        }

        respBody, statusCode, err := s.makeSnapRequest("POST", "/snap/v1/transactions", payload)
        if err != nil {
                return nil, fmt.Errorf("midtrans snap request failed: %w", err)
        }

        if statusCode != 200 && statusCode != 201 {
                return nil, fmt.Errorf("midtrans snap failed (status %d): %s", statusCode, string(respBody))
        }

        var result SnapTransactionResponse
        if err := json.Unmarshal(respBody, &result); err != nil {
                return nil, fmt.Errorf("failed to parse midtrans snap response: %w", err)
        }

        return &result, nil
}

// ─── Direct Charge API (Alternative / Legacy Flow) ──────────────────────────

// CreateTransaction creates a new payment transaction via Midtrans Core API charge.
// Deprecated: Use CreateSnapTransaction for the recommended Snap flow.
func (s *PaymentService) CreateTransaction(orderID string, grossAmount int64, customerName string, customerEmail string, items []ItemDetail) (*CreateTransactionResponse, error) {
        payload := map[string]interface{}{
                "transaction_details": map[string]interface{}{
                        "order_id":     orderID,
                        "gross_amount": grossAmount,
                },
                "customer_details": map[string]interface{}{
                        "first_name": customerName,
                        "email":      customerEmail,
                },
                "item_details": items,
        }

        respBody, statusCode, err := s.makeRequest("POST", "/v2/charge", payload)
        if err != nil {
                return nil, fmt.Errorf("midtrans charge request failed: %w", err)
        }

        if statusCode != 200 && statusCode != 201 && statusCode != 202 {
                return nil, fmt.Errorf("midtrans charge failed (status %d): %s", statusCode, string(respBody))
        }

        var result CreateTransactionResponse
        if err := json.Unmarshal(respBody, &result); err != nil {
                return nil, fmt.Errorf("failed to parse midtrans response: %w", err)
        }

        return &result, nil
}

// CreateQRISTransaction creates a QRIS payment transaction via direct charge.
func (s *PaymentService) CreateQRISTransaction(orderID string, grossAmount int64, customerName string, customerEmail string, items []ItemDetail) (*CreateTransactionResponse, error) {
        payload := map[string]interface{}{
                "payment_type": "qris",
                "transaction_details": map[string]interface{}{
                        "order_id":     orderID,
                        "gross_amount": grossAmount,
                },
                "customer_details": map[string]interface{}{
                        "first_name": customerName,
                        "email":      customerEmail,
                },
                "item_details": items,
        }

        respBody, statusCode, err := s.makeRequest("POST", "/v2/charge", payload)
        if err != nil {
                return nil, fmt.Errorf("midtrans qris charge request failed: %w", err)
        }

        if statusCode != 200 && statusCode != 201 && statusCode != 202 {
                return nil, fmt.Errorf("midtrans qris charge failed (status %d): %s", statusCode, string(respBody))
        }

        var result CreateTransactionResponse
        if err := json.Unmarshal(respBody, &result); err != nil {
                return nil, fmt.Errorf("failed to parse midtrans qris response: %w", err)
        }

        return &result, nil
}

// CreateBankTransferTransaction creates a bank transfer (VA) payment transaction.
func (s *PaymentService) CreateBankTransferTransaction(orderID string, grossAmount int64, customerName string, customerEmail string, items []ItemDetail, bank string) (*CreateTransactionResponse, error) {
        if bank == "" {
                bank = "bca" // default to BCA
        }
        payload := map[string]interface{}{
                "payment_type": "bank_transfer",
                "transaction_details": map[string]interface{}{
                        "order_id":     orderID,
                        "gross_amount": grossAmount,
                },
                "customer_details": map[string]interface{}{
                        "first_name": customerName,
                        "email":      customerEmail,
                },
                "item_details": items,
                "bank_transfer": map[string]interface{}{
                        "bank": bank,
                },
        }

        respBody, statusCode, err := s.makeRequest("POST", "/v2/charge", payload)
        if err != nil {
                return nil, fmt.Errorf("midtrans bank_transfer charge request failed: %w", err)
        }

        if statusCode != 200 && statusCode != 201 && statusCode != 202 {
                return nil, fmt.Errorf("midtrans bank_transfer charge failed (status %d): %s", statusCode, string(respBody))
        }

        var result CreateTransactionResponse
        if err := json.Unmarshal(respBody, &result); err != nil {
                return nil, fmt.Errorf("failed to parse midtrans bank_transfer response: %w", err)
        }

        return &result, nil
}

// CreateGoPayTransaction creates a GoPay e-wallet payment transaction.
func (s *PaymentService) CreateGoPayTransaction(orderID string, grossAmount int64, customerName string, customerEmail string, items []ItemDetail) (*CreateTransactionResponse, error) {
        payload := map[string]interface{}{
                "payment_type": "gopay",
                "transaction_details": map[string]interface{}{
                        "order_id":     orderID,
                        "gross_amount": grossAmount,
                },
                "customer_details": map[string]interface{}{
                        "first_name": customerName,
                        "email":      customerEmail,
                },
                "item_details": items,
        }

        respBody, statusCode, err := s.makeRequest("POST", "/v2/charge", payload)
        if err != nil {
                return nil, fmt.Errorf("midtrans gopay charge request failed: %w", err)
        }

        if statusCode != 200 && statusCode != 201 && statusCode != 202 {
                return nil, fmt.Errorf("midtrans gopay charge failed (status %d): %s", statusCode, string(respBody))
        }

        var result CreateTransactionResponse
        if err := json.Unmarshal(respBody, &result); err != nil {
                return nil, fmt.Errorf("failed to parse midtrans gopay response: %w", err)
        }

        return &result, nil
}

// CreateCreditCardTransaction creates a credit card payment transaction.
func (s *PaymentService) CreateCreditCardTransaction(orderID string, grossAmount int64, customerName string, customerEmail string, items []ItemDetail) (*CreateTransactionResponse, error) {
        payload := map[string]interface{}{
                "payment_type": "credit_card",
                "transaction_details": map[string]interface{}{
                        "order_id":     orderID,
                        "gross_amount": grossAmount,
                },
                "customer_details": map[string]interface{}{
                        "first_name": customerName,
                        "email":      customerEmail,
                },
                "item_details": items,
                "credit_card": map[string]interface{}{
                        "secure": true,
                },
        }

        respBody, statusCode, err := s.makeRequest("POST", "/v2/charge", payload)
        if err != nil {
                return nil, fmt.Errorf("midtrans credit_card charge request failed: %w", err)
        }

        if statusCode != 200 && statusCode != 201 && statusCode != 202 {
                return nil, fmt.Errorf("midtrans credit_card charge failed (status %d): %s", statusCode, string(respBody))
        }

        var result CreateTransactionResponse
        if err := json.Unmarshal(respBody, &result); err != nil {
                return nil, fmt.Errorf("failed to parse midtrans credit_card response: %w", err)
        }

        return &result, nil
}

// ─── Status & Notification ──────────────────────────────────────────────────

// CheckTransactionStatus checks the current status of a transaction from Midtrans.
func (s *PaymentService) CheckTransactionStatus(orderID string) (*TransactionStatusResponse, error) {
        path := fmt.Sprintf("/v2/%s/status", orderID)
        respBody, statusCode, err := s.makeRequest("GET", path, nil)
        if err != nil {
                return nil, fmt.Errorf("midtrans status check request failed: %w", err)
        }

        if statusCode != 200 {
                return nil, fmt.Errorf("midtrans status check failed (status %d): %s", statusCode, string(respBody))
        }

        var result TransactionStatusResponse
        if err := json.Unmarshal(respBody, &result); err != nil {
                return nil, fmt.Errorf("failed to parse midtrans status response: %w", err)
        }

        return &result, nil
}

// HandleNotification parses and validates a Midtrans webhook notification payload.
// It verifies the signature to ensure the notification is authentic.
func (s *PaymentService) HandleNotification(payload []byte) (*NotificationResponse, error) {
        var notif NotificationResponse
        if err := json.Unmarshal(payload, &notif); err != nil {
                return nil, fmt.Errorf("failed to parse notification payload: %w", err)
        }

        // Verify signature key: SHA512(orderId + statusCode + grossAmount + serverKey)
        if !s.VerifySignature(notif.OrderID, notif.StatusCode, notif.GrossAmount, notif.SignatureKey) {
                return nil, fmt.Errorf("invalid signature key — possible fraud")
        }

        return &notif, nil
}

// VerifySignature verifies the Midtrans signature key.
// Primary: SHA-512 signature = SHA512(orderId + statusCode + grossAmount + serverKey)
// Fallback: SHA-256 signature = SHA256(orderId + statusCode + grossAmount + serverKey)
func (s *PaymentService) VerifySignature(orderID, statusCode, grossAmount, signatureKey string) bool {
        if signatureKey == "" {
                return false
        }

        input := orderID + statusCode + grossAmount + s.ServerKey

        // Primary: SHA-512 (current Midtrans standard)
        hash512 := sha512.Sum512([]byte(input))
        expectedSig512 := hex.EncodeToString(hash512[:])
        if expectedSig512 == signatureKey {
                return true
        }

        // Fallback: SHA-256 (some older Midtrans implementations)
        hash256 := sha256.Sum256([]byte(input))
        expectedSig256 := hex.EncodeToString(hash256[:])
        return expectedSig256 == signatureKey
}

// CancelTransaction cancels a transaction via Midtrans.
func (s *PaymentService) CancelTransaction(orderID string) error {
        path := fmt.Sprintf("/v2/%s/cancel", orderID)
        respBody, statusCode, err := s.makeRequest("POST", path, nil)
        if err != nil {
                return fmt.Errorf("midtrans cancel request failed: %w", err)
        }

        if statusCode != 200 && statusCode != 201 && statusCode != 412 {
                // 412 means already settled/captured, which is acceptable
                return fmt.Errorf("midtrans cancel failed (status %d): %s", statusCode, string(respBody))
        }

        return nil
}

// GetClientKey returns the Midtrans client key (for frontend use).
func (s *PaymentService) GetClientKey() string {
        return s.ClientKey
}

// IsSandboxMode returns whether the service is in sandbox mode.
func (s *PaymentService) IsSandboxMode() bool {
        return s.IsSandbox
}
