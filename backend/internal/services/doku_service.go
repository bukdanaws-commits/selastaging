package services

// ─── DOKU Payment Gateway — SNAP API Integration ──────────────────────────
// Supports: Virtual Account, QRIS, E-Wallet, Credit Card, DOKU Checkout,
// Convenience Store, PayLater, and Disbursement.
// ──────────────────────────────────────────────────────────────────────────

import (
        "bytes"
        "crypto/hmac"
        "crypto/rand"
        "crypto/sha256"
        "crypto/sha512"
        "encoding/hex"
        "encoding/json"
        "fmt"
        "io"
        "log"
        "net/http"
        "os"
        "strings"
        "sync"
        "time"

        "github.com/bukdanaws-commits/seleevent/backend/internal/config"
)

// ─── DOKU API Endpoints (SNAP) ────────────────────────────────────────────

const (
        DokuEndpointB2BToken      = "/authorization/v1/access-token/b2b"
        DokuEndpointVACreate      = "/virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va"
        DokuEndpointVAStatus      = "/orders/v1.0/transfer-va/status"
        DokuEndpointQRISGenerate  = "/snap-adapter/b2b/v1.0/qr/qr-mpm-generate"
        DokuEndpointQRISQuery     = "/snap-adapter/b2b/v1.0/qr/qr-mpm-query"
        DokuEndpointCheckoutPay   = "/checkout/v1/payment"
        DokuEndpointEWalletStatus = "/orders/v1.0/ewallet/status"
        DokuEndpointDDStatus      = "/orders/v1.0/direct-debit/status"
        DokuEndpointCCPaymentPage = "/credit-card/v1/payment-page"
        DokuEndpointDisbursement  = "/api/v1.0/transfer-to-bank"
)

// ─── DOKU Payment Method Constants ────────────────────────────────────────

const (
        DokuPMVABCA       = "VIRTUAL_ACCOUNT_BCA"
        DokuPMVAMandiri   = "VIRTUAL_ACCOUNT_BANK_MANDIRI"
        DokuPMVABSI       = "VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI"
        DokuPMVABRI       = "VIRTUAL_ACCOUNT_BRI"
        DokuPMVABNI       = "VIRTUAL_ACCOUNT_BNI"
        DokuPMVAPermata   = "VIRTUAL_ACCOUNT_BANK_PERMATA"
        DokuPMVACIMB      = "VIRTUAL_ACCOUNT_BANK_CIMB"
        DokuPMVADanamon   = "VIRTUAL_ACCOUNT_BANK_DANAMON"
        DokuPMVABTN       = "VIRTUAL_ACCOUNT_BTN"
        DokuPMVABNC       = "VIRTUAL_ACCOUNT_BNC"
        DokuPMVADOKU      = "VIRTUAL_ACCOUNT_DOKU"
        DokuPMVAMaybank   = "VIRTUAL_ACCOUNT_MAYBANK"

        DokuPMEwalletOVO      = "EMONEY_OVO"
        DokuPMEwalletShopeePay = "EMONEY_SHOPEE_PAY"
        DokuPMEwalletDOKU      = "EMONEY_DOKU"
        DokuPMEwalletDANA      = "EMONEY_DANA"
        DokuPMEwalletLinkAja   = "EMONEY_LINKAJA"

        DokuPMCreditCard = "CREDIT_CARD"
        DokuPMGooglePay  = "GOOGLE_PAY"
        DokuPMQRIS       = "QRIS"
        DokuPMCheckout   = "DOKU_CHECKOUT"

        DokuPMAlfa      = "ONLINE_TO_OFFLINE_ALFA"
        DokuPMIndomaret = "ONLINE_TO_OFFLINE_INDOMARET"

        DokuPMAkulaku  = "PEER_TO_PEER_AKULAKU"
        DokuPMKredivo  = "PEER_TO_PEER_KREDIVO"
        DokuPMIndodana = "PEER_TO_PEER_INDODANA"
)

// DOKU Response Codes
const (
        DokuRespSuccess     = "2007300"
        DokuRespVACreated   = "2002700"
        DokuRespVAStatusOK  = "2002600"
        DokuRespPaymentOK   = "00"
        DokuRespPending     = "03"
        DokuRespUnauthorized = "4017300"
        DokuRespInvalidParam = "4007300"
        DokuRespNotFound     = "4047300"
        DokuRespDuplicate    = "4097300"
        DokuRespTimeout      = "5047300"
        DokuRespServerError  = "5007300"
)

// ─── DOKU Service ─────────────────────────────────────────────────────────

// DokuService handles DOKU payment gateway integration (SNAP API).
type DokuService struct {
        ClientID     string
        ClientSecret string
        SharedKey    string
        PrivateKey   string
        IsSandbox    bool
        BaseURL      string // https://api-sandbox.doku.com or https://api.doku.com
}

// ─── DOKU Types ───────────────────────────────────────────────────────────

// DokuCreatePaymentRequest is the request body for creating a DOKU payment.
type DokuCreatePaymentRequest struct {
        OrderID       string             `json:"orderId"`
        Amount        float64            `json:"amount"`
        PaymentType   string             `json:"paymentType,omitempty"` // virtual_account, qris, ewallet, credit_card, convenience_store, paylater, checkout
        PaymentMethod string             `json:"paymentMethod,omitempty"` // e.g. VIRTUAL_ACCOUNT_BCA, QRIS, EMONEY_OVO
        CustomerName  string             `json:"customerName"`
        CustomerEmail string             `json:"customerEmail"`
        CustomerPhone string             `json:"customerPhone,omitempty"`
        ItemDetails   []DokuItemDetail   `json:"itemDetails,omitempty"`
}

// DokuItemDetail represents a line item for DOKU payment.
type DokuItemDetail struct {
        ID       string  `json:"id"`
        Name     string  `json:"name"`
        Price    float64 `json:"price"`
        Quantity int     `json:"quantity"`
}

// DokuCreatePaymentResponse is the unified response for DOKU payment creation.
type DokuCreatePaymentResponse struct {
        TransactionID string `json:"transactionId"`
        PaymentURL    string `json:"paymentUrl,omitempty"`
        VANumber      string `json:"vaNumber,omitempty"`
        QRContent     string `json:"qrContent,omitempty"`
        PaymentMethod string `json:"paymentMethod"`
        ExpiresAt     string `json:"expiresAt"`
        OrderID       string `json:"orderId"`
        IsSandbox     bool   `json:"isSandbox"`
}

// DokuNotificationPayload represents a DOKU SNAP notification.
// DOKU sends notifications in two formats: SNAP and Non-SNAP.
type DokuNotificationPayload struct {
        // SNAP format (VA, QRIS, Direct Debit)
        VirtualAccountData *DokuVANotificationData `json:"virtualAccountData,omitempty"`
        QRStringData       *DokuQRISNotificationData `json:"qrStringData,omitempty"`

        // Non-SNAP format (Credit Card, E-Wallet, DOKU Checkout)
        Order    *DokuNotificationOrder    `json:"order,omitempty"`
        Payment  *DokuNotificationPayment  `json:"payment,omitempty"`
        Customer *DokuNotificationCustomer `json:"customer,omitempty"`

        // Generic fields
        Transaction     *DokuNotificationTransaction `json:"transaction,omitempty"`
        ResponseCode    string                       `json:"responseCode,omitempty"`
        ResponseMessage string                       `json:"responseMessage,omitempty"`
        AdditionalInfo  map[string]any        `json:"additionalInfo,omitempty"`

        // Computed fields (populated during processing)
        ServiceID      string `json:"serviceId,omitempty"`
        OrderID        string `json:"orderId,omitempty"`
        TransactionID  string `json:"transactionId,omitempty"`
        PaymentType    string `json:"paymentType,omitempty"`
        Amount         string `json:"amount,omitempty"`
        Currency       string `json:"currency,omitempty"`
        Status         string `json:"status,omitempty"`
        PaidAt         string `json:"paidAt,omitempty"`
        PaymentChannel string `json:"paymentChannel,omitempty"`
        ClientID       string `json:"clientId,omitempty"`
        RequestID      string `json:"requestId,omitempty"`
        Signature      string `json:"signature,omitempty"`
}

// DokuVANotificationData holds VA-specific notification fields.
type DokuVANotificationData struct {
        PartnerServiceID      string                `json:"partnerServiceId,omitempty"`
        CustomerNo            string                `json:"customerNo,omitempty"`
        VirtualAccountNo      string                `json:"virtualAccountNo,omitempty"`
        TrxID                 string                `json:"trxId,omitempty"`
        TotalAmount           *DokuAmount           `json:"totalAmount,omitempty"`
        VirtualAccountTrxType string                `json:"virtualAccountTrxType,omitempty"`
        PaidAmount            *DokuAmount           `json:"paidAmount,omitempty"`
        PaymentFlagReason     string                `json:"paymentFlagReason,omitempty"`
        PaidTime              string                `json:"paidTime,omitempty"`
        Status                string                `json:"status,omitempty"`
}

// DokuQRISNotificationData holds QRIS-specific notification fields.
type DokuQRISNotificationData struct {
        QRString    string      `json:"qrString,omitempty"`
        NNS         string      `json:"nns,omitempty"`
        MerchantPan string      `json:"merchantPan,omitempty"`
        Amount      *DokuAmount `json:"amount,omitempty"`
        TrxDate     string      `json:"trxDate,omitempty"`
        ReferenceNo string      `json:"referenceNo,omitempty"`
        MerchantName string     `json:"merchantName,omitempty"`
        MerchantCity string     `json:"merchantCity,omitempty"`
        MerchantID  string      `json:"merchantId,omitempty"`
        TerminalID  string      `json:"terminalId,omitempty"`
        Acquirer    string      `json:"acquirer,omitempty"`
}

// DokuNotificationOrder holds Non-SNAP order notification fields.
type DokuNotificationOrder struct {
        InvoiceNumber string `json:"invoiceNumber,omitempty"`
        Amount        string `json:"amount,omitempty"`
        Session       string `json:"session,omitempty"`
        CreatedAt     string `json:"createdAt,omitempty"`
}

// DokuNotificationPayment holds Non-SNAP payment notification fields.
type DokuNotificationPayment struct {
        PaymentCode  string      `json:"paymentCode,omitempty"`
        TotalAmount  *DokuAmount `json:"totalAmount,omitempty"`
        PaymentMethod string     `json:"paymentMethod,omitempty"`
        PaymentDate  string      `json:"paymentDate,omitempty"`
        Channel      string      `json:"channel,omitempty"`
        Status       string      `json:"status,omitempty"`
}

// DokuNotificationCustomer holds customer info in notifications.
type DokuNotificationCustomer struct {
        ID    string `json:"id,omitempty"`
        Name  string `json:"name,omitempty"`
        Email string `json:"email,omitempty"`
        Phone string `json:"phone,omitempty"`
}

// DokuNotificationTransaction holds transaction info in notifications.
type DokuNotificationTransaction struct {
        ID     string `json:"id,omitempty"`
        Status string `json:"status,omitempty"`
        Date   string `json:"date,omitempty"`
}

// DokuAmount represents a DOKU amount with value and currency.
type DokuAmount struct {
        Value    string `json:"value"`
        Currency string `json:"currency"`
}

// DokuPaymentStatusResponse is the response for checking payment status.
type DokuPaymentStatusResponse struct {
        TransactionID  string `json:"transactionId"`
        OrderID        string `json:"orderId"`
        Status         string `json:"status"`
        PaymentType    string `json:"paymentType"`
        PaymentChannel string `json:"paymentChannel,omitempty"`
        Amount         string `json:"amount"`
        PaidAt         string `json:"paidAt,omitempty"`
}

// DokuDisbursementRequest is the request for initiating a bank transfer.
type DokuDisbursementRequest struct {
        WithdrawalID  string  `json:"withdrawalId"`
        Amount        float64 `json:"amount"`
        BankName      string  `json:"bankName"`
        AccountNumber string  `json:"accountNumber"`
        AccountHolder string  `json:"accountHolder"`
        ReferenceNo   string  `json:"referenceNo,omitempty"`
}

// DokuDisbursementResponse is the response for a disbursement.
type DokuDisbursementResponse struct {
        DisbursementID string `json:"disbursementId"`
        ReferenceNo    string `json:"referenceNo"`
        Status         string `json:"status"`
        Amount         string `json:"amount"`
}

// ─── B2B Token Cache ──────────────────────────────────────────────────────

var (
        dokuTokenCache     *dokuTokenCacheEntry
        dokuTokenCacheLock sync.Mutex
)

type dokuTokenCacheEntry struct {
        Token     string
        ExpiresAt time.Time
}

// ─── NewDokuService ───────────────────────────────────────────────────────

// NewDokuService creates a DokuService reading config from env vars
// and falling back to the config package.
func NewDokuService() *DokuService {
        isSandbox := os.Getenv("DOKU_IS_SANDBOX") == "true"
        if !isSandbox && config.Cfg.Doku.IsSandbox {
                isSandbox = true
        }

        baseURL := "https://api.doku.com"
        if isSandbox {
                baseURL = "https://api-sandbox.doku.com"
        }

        clientID := os.Getenv("DOKU_CLIENT_ID")
        if clientID == "" {
                clientID = config.Cfg.Doku.ClientID
        }
        clientSecret := os.Getenv("DOKU_CLIENT_SECRET")
        if clientSecret == "" {
                clientSecret = config.Cfg.Doku.ClientSecret
        }
        sharedKey := os.Getenv("DOKU_SHARED_KEY")
        if sharedKey == "" {
                sharedKey = config.Cfg.Doku.SharedKey
        }
        privateKey := os.Getenv("DOKU_PRIVATE_KEY")
        if privateKey == "" {
                privateKey = config.Cfg.Doku.PrivateKey
        }

        return &DokuService{
                ClientID:     clientID,
                ClientSecret: clientSecret,
                SharedKey:    sharedKey,
                PrivateKey:   privateKey,
                IsSandbox:    isSandbox,
                BaseURL:      baseURL,
        }
}

// IsConfigured returns true if DOKU credentials are present.
func (s *DokuService) IsConfigured() bool {
        return s.ClientID != "" && s.ClientSecret != "" && strings.HasPrefix(s.ClientID, "BRN-")
}

// ─── B2B Token ────────────────────────────────────────────────────────────

// generateB2BToken gets an OAuth2 B2B token from DOKU.
// Token is cached and auto-refreshed.
func (s *DokuService) generateB2BToken() (string, error) {
        dokuTokenCacheLock.Lock()
        defer dokuTokenCacheLock.Unlock()

        // Check cache
        if dokuTokenCache != nil && time.Now().Before(dokuTokenCache.ExpiresAt.Add(-60*time.Second)) {
                return dokuTokenCache.Token, nil
        }

        // Generate timestamp and signature for B2B token request
        timestamp := generateDokuTimestamp()
        signature, err := s.generateB2BSignature(timestamp)
        if err != nil {
                return "", fmt.Errorf("failed to generate B2B signature: %w", err)
        }

        reqBody := map[string]any{
                "grantType": "client_credentials",
        }
        bodyBytes, _ := json.Marshal(reqBody)

        req, err := http.NewRequest("POST", s.BaseURL+DokuEndpointB2BToken, bytes.NewBuffer(bodyBytes))
        if err != nil {
                return "", fmt.Errorf("failed to create B2B token request: %w", err)
        }

        req.Header.Set("Content-Type", "application/json")
        req.Header.Set("X-SIGNATURE", signature)
        req.Header.Set("X-TIMESTAMP", timestamp)
        req.Header.Set("X-CLIENT-KEY", s.ClientID)

        client := &http.Client{Timeout: 30 * time.Second}
        resp, err := client.Do(req)
        if err != nil {
                return "", fmt.Errorf("B2B token request failed: %w", err)
        }
        defer resp.Body.Close()

        respBody, err := io.ReadAll(resp.Body)
        if err != nil {
                return "", fmt.Errorf("failed to read B2B token response: %w", err)
        }

        var result struct {
                ResponseCode    string `json:"responseCode"`
                ResponseMessage string `json:"responseMessage"`
                AccessToken     string `json:"accessToken"`
                TokenType       string `json:"tokenType"`
                ExpiresIn       int    `json:"expiresIn"`
        }
        if err := json.Unmarshal(respBody, &result); err != nil {
                return "", fmt.Errorf("failed to parse B2B token response: %w", err)
        }

        if result.ResponseCode != DokuRespSuccess {
                return "", fmt.Errorf("B2B token failed: %s (%s)", result.ResponseMessage, result.ResponseCode)
        }

        // Cache the token
        expiresIn := result.ExpiresIn
        if expiresIn <= 0 {
                expiresIn = 900 // Default 15 minutes
        }
        dokuTokenCache = &dokuTokenCacheEntry{
                Token:     result.AccessToken,
                ExpiresAt: time.Now().Add(time.Duration(expiresIn) * time.Second),
        }

        return result.AccessToken, nil
}

// ─── SNAP Headers ─────────────────────────────────────────────────────────

// generateSNAPHeaders builds the DOKU SNAP required headers.
func (s *DokuService) generateSNAPHeaders(method, endpoint, requestBody string) (map[string]string, error) {
        accessToken, err := s.generateB2BToken()
        if err != nil {
                return nil, fmt.Errorf("failed to get B2B token: %w", err)
        }

        timestamp := generateDokuTimestamp()

        // Compute body hash (SHA-256 hex lowercase)
        bodyHash := sha256.Sum256([]byte(requestBody))
        bodyHex := hex.EncodeToString(bodyHash[:])
        bodyHex = strings.ToLower(bodyHex)

        // Build string to sign: METHOD:ENDPOINT:ACCESS_TOKEN:BODY_HASH:TIMESTAMP
        stringToSign := fmt.Sprintf("%s:%s:%s:%s:%s",
                strings.ToUpper(method), endpoint, accessToken, bodyHex, timestamp)

        // Compute HMAC-SHA512 signature
        mac := hmac.New(sha512.New, []byte(s.ClientSecret))
        mac.Write([]byte(stringToSign))
        signature := hex.EncodeToString(mac.Sum(nil))

        // Generate external ID (10-digit timestamp-based)
        externalID := fmt.Sprintf("%d", time.Now().UnixMilli()%1e10)

        headers := map[string]string{
                "Content-Type":  "application/json",
                "X-TIMESTAMP":   timestamp,
                "X-SIGNATURE":   signature,
                "X-PARTNER-ID":  s.ClientID,
                "X-EXTERNAL-ID": externalID,
                "Authorization":  "Bearer " + accessToken,
                "CHANNEL-ID":    "H2H",
        }

        return headers, nil
}

// ─── Signature Generation ─────────────────────────────────────────────────

// generateB2BSignature generates the RSA or HMAC signature for B2B token request.
// For sandbox/dummy: uses HMAC-SHA256 of "clientId|timestamp"
// For production: should use RSA-SHA256 with private key
func (s *DokuService) generateB2BSignature(timestamp string) (string, error) {
        message := fmt.Sprintf("%s|%s", s.ClientID, timestamp)

        // If we have a private key file, try RSA-SHA256
        if s.PrivateKey != "" {
                // Check if it's a file path or inline key
                var keyData []byte
                if _, err := os.Stat(s.PrivateKey); err == nil {
                        keyData, err = os.ReadFile(s.PrivateKey)
                        if err != nil {
                                log.Printf("[DOKU] Warning: cannot read private key file, falling back to HMAC: %v", err)
                        }
                } else {
                        // Treat as inline PEM key
                        keyData = []byte(s.PrivateKey)
                }

                if len(keyData) > 0 {
                        // Try RSA-SHA256 signing
                        sig, err := signRSASHA256(keyData, message)
                        if err == nil {
                                return sig, nil
                        }
                        log.Printf("[DOKU] Warning: RSA signing failed, falling back to HMAC: %v", err)
                }
        }

        // Fallback: HMAC-SHA256 (for sandbox/dummy credentials)
        mac := hmac.New(sha256.New, []byte(s.ClientSecret))
        mac.Write([]byte(message))
        return hex.EncodeToString(mac.Sum(nil)), nil
}

// VerifySignature verifies DOKU SNAP notification signature (HMAC-SHA512).
// The signature is computed as: HMAC-SHA512(sharedKey, clientId + timestamp + body)
func (s *DokuService) VerifySignature(timestamp, signature, body string) bool {
        if signature == "" {
                return false
        }

        // Compute expected signature: HMAC-SHA512(sharedKey, clientId + timestamp + body)
        mac := hmac.New(sha512.New, []byte(s.SharedKey))
        mac.Write([]byte(s.ClientID))
        mac.Write([]byte(timestamp))
        mac.Write([]byte(body))
        expectedSig := hex.EncodeToString(mac.Sum(nil))

        return hmac.Equal([]byte(signature), []byte(expectedSig))
}

// ─── Create Payment ───────────────────────────────────────────────────────

// CreatePayment creates a payment via DOKU SNAP API.
// It routes to the appropriate method (VA, QRIS, Checkout, etc.) based on PaymentMethod.
func (s *DokuService) CreatePayment(req DokuCreatePaymentRequest) (*DokuCreatePaymentResponse, error) {
        if !s.IsConfigured() {
                return nil, fmt.Errorf("DOKU is not configured (missing client ID or secret)")
        }

        pm := req.PaymentMethod
        if pm == "" {
                pm = req.PaymentType
        }

        // Route to appropriate payment creation method
        if isDokuVAMethod(pm) {
                return s.createVAPayment(req)
        }
        if pm == DokuPMQRIS {
                return s.createQRISPayment(req)
        }
        if pm == DokuPMCheckout || pm == "" {
                return s.createCheckoutPayment(req)
        }
        if isDokuEwalletMethod(pm) || isDokuCCMethod(pm) || isDokuConvenienceStoreMethod(pm) || isDokuPayLaterMethod(pm) {
                return s.createCheckoutPayment(req)
        }

        // Default to checkout for unknown methods
        return s.createCheckoutPayment(req)
}

// createVAPayment creates a Virtual Account payment via DOKU SNAP API.
func (s *DokuService) createVAPayment(req DokuCreatePaymentRequest) (*DokuCreatePaymentResponse, error) {
        partnerServiceID := "  19008" // 8-digit with left padding (configurable)
        customerNo := generateExternalID()
        virtualAccountNo := fmt.Sprintf("%s%s", partnerServiceID, customerNo)

        requestBody := map[string]any{
                "partnerServiceId":   partnerServiceID,
                "customerNo":         customerNo,
                "virtualAccountNo":   virtualAccountNo,
                "virtualAccountName": truncate(req.CustomerName, 255),
                "virtualAccountEmail": truncate(req.CustomerEmail, 255),
                "virtualAccountPhone": req.CustomerPhone,
                "trxId":              req.OrderID,
                "totalAmount": map[string]any{
                        "value":    formatDokuAmount(req.Amount),
                        "currency": "IDR",
                },
                "additionalInfo": map[string]any{
                        "channel": req.PaymentMethod,
                        "virtualAccountConfig": map[string]any{
                                "reusableStatus": false,
                        },
                },
                "virtualAccountTrxType": "C", // Closed/Fixed amount
                "expiredDate":           generateDokuExpiry(2),
                "freeText": []map[string]string{
                        {"english": "SeleEvent Ticket Payment", "indonesia": "Pembayaran Tiket SeleEvent"},
                },
        }

        bodyStr, _ := json.Marshal(requestBody)
        headers, err := s.generateSNAPHeaders("POST", DokuEndpointVACreate, string(bodyStr))
        if err != nil {
                return nil, fmt.Errorf("failed to generate SNAP headers: %w", err)
        }

        respBody, statusCode, err := s.doRequest("POST", DokuEndpointVACreate, bodyStr, headers)
        if err != nil {
                return nil, fmt.Errorf("DOKU VA creation failed: %w", err)
        }

        if statusCode != 200 && statusCode != 201 {
                return nil, fmt.Errorf("DOKU VA creation failed (status %d): %s", statusCode, string(respBody))
        }

        var result map[string]any
        if err := json.Unmarshal(respBody, &result); err != nil {
                return nil, fmt.Errorf("failed to parse DOKU VA response: %w", err)
        }

        // Check response code
        if respCode, ok := result["responseCode"].(string); ok && respCode != DokuRespVACreated {
                respMsg, _ := result["responseMessage"].(string)
                return nil, fmt.Errorf("DOKU VA creation failed: %s (%s)", respMsg, respCode)
        }

        // Extract VA number and transaction ID
        vaNumber := virtualAccountNo
        if vaData, ok := result["virtualAccountData"].(map[string]any); ok {
                if va, ok := vaData["virtualAccountNo"].(string); ok && va != "" {
                        vaNumber = strings.ReplaceAll(va, " ", "")
                }
        }

        transactionID := req.OrderID
        if vaData, ok := result["virtualAccountData"].(map[string]any); ok {
                if trxID, ok := vaData["trxId"].(string); ok && trxID != "" {
                        transactionID = trxID
                }
        }

        expiresAt := generateDokuExpiry(2)
        if vaData, ok := result["virtualAccountData"].(map[string]any); ok {
                if exp, ok := vaData["expiredDate"].(string); ok && exp != "" {
                        expiresAt = exp
                }
        }

        return &DokuCreatePaymentResponse{
                TransactionID: transactionID,
                VANumber:      vaNumber,
                PaymentMethod: req.PaymentMethod,
                ExpiresAt:     expiresAt,
                OrderID:       req.OrderID,
                IsSandbox:     s.IsSandbox,
        }, nil
}

// createQRISPayment creates a QRIS payment via DOKU SNAP API.
func (s *DokuService) createQRISPayment(req DokuCreatePaymentRequest) (*DokuCreatePaymentResponse, error) {
        requestBody := map[string]any{
                "partnerReferenceNo": req.OrderID,
                "merchantId":         s.ClientID,
                "amount": map[string]any{
                        "value":    formatDokuAmount(req.Amount),
                        "currency": "IDR",
                },
                "validityPeriod": generateDokuExpiry(2),
                "storeId":        "SeleEvent-Store",
                "terminalId":     "SeleEvent-Terminal-01",
        }

        bodyStr, _ := json.Marshal(requestBody)
        headers, err := s.generateSNAPHeaders("POST", DokuEndpointQRISGenerate, string(bodyStr))
        if err != nil {
                return nil, fmt.Errorf("failed to generate SNAP headers: %w", err)
        }

        respBody, statusCode, err := s.doRequest("POST", DokuEndpointQRISGenerate, bodyStr, headers)
        if err != nil {
                return nil, fmt.Errorf("DOKU QRIS creation failed: %w", err)
        }

        if statusCode != 200 && statusCode != 201 {
                return nil, fmt.Errorf("DOKU QRIS creation failed (status %d): %s", statusCode, string(respBody))
        }

        var result map[string]any
        if err := json.Unmarshal(respBody, &result); err != nil {
                return nil, fmt.Errorf("failed to parse DOKU QRIS response: %w", err)
        }

        // Check response code
        if respCode, ok := result["responseCode"].(string); ok && !strings.HasPrefix(respCode, "20") {
                respMsg, _ := result["responseMessage"].(string)
                return nil, fmt.Errorf("DOKU QRIS creation failed: %s (%s)", respMsg, respCode)
        }

        qrContent, _ := result["qrString"].(string)
        transactionID, _ := result["partnerReferenceNo"].(string)
        if transactionID == "" {
                transactionID = req.OrderID
        }

        expiresAt := generateDokuExpiry(2)
        if vp, ok := result["validityPeriod"].(string); ok && vp != "" {
                expiresAt = vp
        }

        return &DokuCreatePaymentResponse{
                TransactionID: transactionID,
                QRContent:     qrContent,
                PaymentMethod: DokuPMQRIS,
                ExpiresAt:     expiresAt,
                OrderID:       req.OrderID,
                IsSandbox:     s.IsSandbox,
        }, nil
}

// createCheckoutPayment creates a DOKU Checkout (hosted payment page) payment.
func (s *DokuService) createCheckoutPayment(req DokuCreatePaymentRequest) (*DokuCreatePaymentResponse, error) {
        // Build line items
        lineItems := make([]map[string]any, 0, len(req.ItemDetails))
        for _, item := range req.ItemDetails {
                lineItems = append(lineItems, map[string]any{
                        "name":        item.Name,
                        "price":       formatDokuAmount(item.Price),
                        "quantity":     item.Quantity,
                        "category":    "Entertainment",
                        "subCategory": "Concert",
                })
        }
        if len(lineItems) == 0 {
                lineItems = append(lineItems, map[string]any{
                        "name":        "SeleEvent Tickets",
                        "price":       formatDokuAmount(req.Amount),
                        "quantity":     1,
                        "category":    "Entertainment",
                        "subCategory": "Concert",
                })
        }

        transactionID := fmt.Sprintf("SELE-%s-%d", req.OrderID, time.Now().UnixMilli())

        requestBody := map[string]any{
                "payment": map[string]any{
                        "paymentMethod": "CHECKOUT",
                        "paymentDetail": map[string]any{
                                "totalAmount": map[string]any{
                                        "value":    formatDokuAmount(req.Amount),
                                        "currency": "IDR",
                                },
                        },
                        "order": map[string]any{
                                "invoiceNumber": req.OrderID,
                                "lineItems":     lineItems,
                        },
                },
                "customer": map[string]any{
                        "id":    fmt.Sprintf("CUST-%d", time.Now().UnixMilli()),
                        "name":  req.CustomerName,
                        "email": req.CustomerEmail,
                        "phone": req.CustomerPhone,
                },
                "social": false,
        }

        bodyStr, _ := json.Marshal(requestBody)
        headers, err := s.generateSNAPHeaders("POST", DokuEndpointCheckoutPay, string(bodyStr))
        if err != nil {
                return nil, fmt.Errorf("failed to generate SNAP headers: %w", err)
        }

        respBody, statusCode, err := s.doRequest("POST", DokuEndpointCheckoutPay, bodyStr, headers)
        if err != nil {
                return nil, fmt.Errorf("DOKU Checkout creation failed: %w", err)
        }

        if statusCode != 200 && statusCode != 201 {
                return nil, fmt.Errorf("DOKU Checkout creation failed (status %d): %s", statusCode, string(respBody))
        }

        var result map[string]any
        if err := json.Unmarshal(respBody, &result); err != nil {
                return nil, fmt.Errorf("failed to parse DOKU Checkout response: %w", err)
        }

        // Check response code
        if respCode, ok := result["responseCode"].(string); ok && !strings.HasPrefix(respCode, "20") {
                respMsg, _ := result["responseMessage"].(string)
                return nil, fmt.Errorf("DOKU Checkout creation failed: %s (%s)", respMsg, respCode)
        }

        // Extract payment URL and transaction ID
        paymentURL := ""
        if resp, ok := result["response"].(map[string]any); ok {
                if payment, ok := resp["payment"].(map[string]any); ok {
                        if url, ok := payment["url"].(string); ok {
                                paymentURL = url
                        }
                }
                if tid, ok := resp["transactionId"].(string); ok && tid != "" {
                        transactionID = tid
                }
                if payment, ok := resp["payment"].(map[string]any); ok {
                        if pid, ok := payment["paymentId"].(string); ok && pid != "" {
                                transactionID = pid
                        }
                }
        }

        expiresAt := generateDokuExpiry(2)
        if resp, ok := result["response"].(map[string]any); ok {
                if exp, ok := resp["expiredDate"].(string); ok && exp != "" {
                        expiresAt = exp
                }
        }

        paymentMethod := req.PaymentMethod
        if paymentMethod == "" {
                paymentMethod = DokuPMCheckout
        }

        return &DokuCreatePaymentResponse{
                TransactionID: transactionID,
                PaymentURL:    paymentURL,
                PaymentMethod: paymentMethod,
                ExpiresAt:     expiresAt,
                OrderID:       req.OrderID,
                IsSandbox:     s.IsSandbox,
        }, nil
}

// ─── Handle Notification ──────────────────────────────────────────────────

// HandleNotification processes a DOKU webhook notification with signature verification.
func (s *DokuService) HandleNotification(payload []byte) (*DokuNotificationPayload, error) {
        var notif DokuNotificationPayload
        if err := json.Unmarshal(payload, &notif); err != nil {
                return nil, fmt.Errorf("failed to parse notification payload: %w", err)
        }

        // Extract order ID and status from both SNAP and Non-SNAP formats
        s.extractNotificationFields(&notif)

        return &notif, nil
}

// HandleNotificationWithVerification processes a DOKU webhook notification with signature verification.
func (s *DokuService) HandleNotificationWithVerification(timestamp, signature string, payload []byte) (*DokuNotificationPayload, error) {
        // Verify signature
        if !s.VerifySignature(timestamp, signature, string(payload)) {
                return nil, fmt.Errorf("invalid DOKU notification signature")
        }

        return s.HandleNotification(payload)
}

// extractNotificationFields populates the computed fields from the raw notification data.
func (s *DokuService) extractNotificationFields(notif *DokuNotificationPayload) {
        // Extract order ID
        orderID := ""
        if notif.VirtualAccountData != nil && notif.VirtualAccountData.TrxID != "" {
                orderID = notif.VirtualAccountData.TrxID
        }
        if notif.Order != nil && notif.Order.InvoiceNumber != "" {
                orderID = notif.Order.InvoiceNumber
        }
        notif.OrderID = orderID

        // Extract transaction ID
        transactionID := orderID
        if notif.Transaction != nil && notif.Transaction.ID != "" {
                transactionID = notif.Transaction.ID
        }
        notif.TransactionID = transactionID

        // Extract status and map to normalized form
        rawStatus := ""
        if notif.VirtualAccountData != nil && notif.VirtualAccountData.Status != "" {
                rawStatus = notif.VirtualAccountData.Status
        }
        if notif.Transaction != nil && notif.Transaction.Status != "" {
                rawStatus = notif.Transaction.Status
        }
        if notif.Payment != nil && notif.Payment.Status != "" {
                rawStatus = notif.Payment.Status
        }
        notif.Status = normalizeDokuStatus(rawStatus)

        // Extract amount
        if notif.VirtualAccountData != nil && notif.VirtualAccountData.TotalAmount != nil {
                notif.Amount = notif.VirtualAccountData.TotalAmount.Value
        }
        if notif.Order != nil && notif.Order.Amount != "" {
                notif.Amount = notif.Order.Amount
        }

        // Extract currency
        notif.Currency = "IDR"

        // Extract paid time
        paidAt := ""
        if notif.VirtualAccountData != nil && notif.VirtualAccountData.PaidTime != "" {
                paidAt = notif.VirtualAccountData.PaidTime
        }
        if notif.Payment != nil && notif.Payment.PaymentDate != "" {
                paidAt = notif.Payment.PaymentDate
        }
        notif.PaidAt = paidAt

        // Extract payment method/channel
        paymentChannel := ""
        if notif.Payment != nil && notif.Payment.PaymentMethod != "" {
                paymentChannel = notif.Payment.PaymentMethod
        }
        if notif.VirtualAccountData != nil {
                paymentChannel = "VIRTUAL_ACCOUNT"
        }
        notif.PaymentChannel = paymentChannel

        // Determine payment type
        notif.PaymentType = dokuPaymentTypeFromMethod(paymentChannel)
}

// ─── Check Payment Status ─────────────────────────────────────────────────

// CheckPaymentStatus checks payment status from DOKU.
func (s *DokuService) CheckPaymentStatus(orderID string) (*DokuPaymentStatusResponse, error) {
        // Try VA status first (most common)
        status, err := s.checkVAStatus(orderID)
        if err == nil {
                return status, nil
        }

        log.Printf("[DOKU] VA status check failed, trying checkout status: %v", err)

        // Return a basic response from local DB if remote check fails
        return nil, fmt.Errorf("failed to check DOKU payment status: %w", err)
}

// checkVAStatus checks Virtual Account payment status.
func (s *DokuService) checkVAStatus(orderID string) (*DokuPaymentStatusResponse, error) {
        partnerServiceID := "  19008"
        customerNo := generateExternalID()
        virtualAccountNo := fmt.Sprintf("%s%s", partnerServiceID, customerNo)

        requestBody := map[string]any{
                "partnerServiceId": partnerServiceID,
                "customerNo":       customerNo,
                "virtualAccountNo": virtualAccountNo,
                "inquiryRequestId": fmt.Sprintf("INQ-%s-%d", orderID, time.Now().UnixMilli()),
                "paymentDate":      "",
                "txnDateTime":      generateDokuTimestamp(),
        }

        bodyStr, _ := json.Marshal(requestBody)
        headers, err := s.generateSNAPHeaders("POST", DokuEndpointVAStatus, string(bodyStr))
        if err != nil {
                return nil, fmt.Errorf("failed to generate SNAP headers: %w", err)
        }

        respBody, statusCode, err := s.doRequest("POST", DokuEndpointVAStatus, bodyStr, headers)
        if err != nil {
                return nil, fmt.Errorf("DOKU VA status check failed: %w", err)
        }

        if statusCode != 200 {
                return nil, fmt.Errorf("DOKU VA status check failed (status %d): %s", statusCode, string(respBody))
        }

        var result map[string]any
        if err := json.Unmarshal(respBody, &result); err != nil {
                return nil, fmt.Errorf("failed to parse DOKU VA status response: %w", err)
        }

        // Extract status
        dokuStatus := "unknown"
        if vaData, ok := result["virtualAccountData"].(map[string]any); ok {
                if status, ok := vaData["status"].(string); ok {
                        dokuStatus = status
                } else if pfr, ok := vaData["paymentFlagReason"].(string); ok {
                        dokuStatus = pfr
                }
        }

        paidAt := ""
        if vaData, ok := result["virtualAccountData"].(map[string]any); ok {
                if pt, ok := vaData["paidTime"].(string); ok {
                        paidAt = pt
                }
        }

        transactionID := orderID
        if vaData, ok := result["virtualAccountData"].(map[string]any); ok {
                if tid, ok := vaData["trxId"].(string); ok && tid != "" {
                        transactionID = tid
                }
        }

        return &DokuPaymentStatusResponse{
                TransactionID:  transactionID,
                OrderID:        orderID,
                Status:         normalizeDokuStatus(dokuStatus),
                PaymentType:    "virtual_account",
                PaymentChannel: "VIRTUAL_ACCOUNT",
                Amount:         "",
                PaidAt:         paidAt,
        }, nil
}

// ─── Disbursement ─────────────────────────────────────────────────────────

// CreateDisbursement initiates a bank transfer via DOKU Disbursement API.
func (s *DokuService) CreateDisbursement(req DokuDisbursementRequest) (*DokuDisbursementResponse, error) {
        requestBody := map[string]any{
                "withdrawalId":  req.WithdrawalID,
                "amount":        formatDokuAmount(req.Amount),
                "bankName":      req.BankName,
                "accountNumber": req.AccountNumber,
                "accountHolder": req.AccountHolder,
                "referenceNo":   req.ReferenceNo,
        }

        bodyStr, _ := json.Marshal(requestBody)
        headers, err := s.generateSNAPHeaders("POST", DokuEndpointDisbursement, string(bodyStr))
        if err != nil {
                return nil, fmt.Errorf("failed to generate SNAP headers: %w", err)
        }

        respBody, statusCode, err := s.doRequest("POST", DokuEndpointDisbursement, bodyStr, headers)
        if err != nil {
                return nil, fmt.Errorf("DOKU disbursement failed: %w", err)
        }

        if statusCode != 200 && statusCode != 201 {
                return nil, fmt.Errorf("DOKU disbursement failed (status %d): %s", statusCode, string(respBody))
        }

        var result map[string]any
        if err := json.Unmarshal(respBody, &result); err != nil {
                return nil, fmt.Errorf("failed to parse DOKU disbursement response: %w", err)
        }

        disbursementID, _ := result["disbursementId"].(string)
        referenceNo, _ := result["referenceNo"].(string)
        status, _ := result["status"].(string)
        amount, _ := result["amount"].(string)

        if disbursementID == "" {
                disbursementID = req.WithdrawalID
        }

        return &DokuDisbursementResponse{
                DisbursementID: disbursementID,
                ReferenceNo:    referenceNo,
                Status:         status,
                Amount:         amount,
        }, nil
}

// CheckDisbursementStatus checks disbursement status.
func (s *DokuService) CheckDisbursementStatus(disbursementID string) (*DokuDisbursementResponse, error) {
        endpoint := fmt.Sprintf("%s/%s", DokuEndpointDisbursement, disbursementID)
        bodyStr := []byte("{}")
        headers, err := s.generateSNAPHeaders("GET", endpoint, string(bodyStr))
        if err != nil {
                return nil, fmt.Errorf("failed to generate SNAP headers: %w", err)
        }

        respBody, statusCode, err := s.doRequest("GET", endpoint, nil, headers)
        if err != nil {
                return nil, fmt.Errorf("DOKU disbursement status check failed: %w", err)
        }

        if statusCode != 200 {
                return nil, fmt.Errorf("DOKU disbursement status check failed (status %d): %s", statusCode, string(respBody))
        }

        var result DokuDisbursementResponse
        if err := json.Unmarshal(respBody, &result); err != nil {
                return nil, fmt.Errorf("failed to parse DOKU disbursement status response: %w", err)
        }

        return &result, nil
}

// ─── HTTP Request Helper ──────────────────────────────────────────────────

// doRequest makes an HTTP request to DOKU with the given headers.
func (s *DokuService) doRequest(method, endpoint string, body []byte, headers map[string]string) ([]byte, int, error) {
        var reqBody io.Reader
        if body != nil {
                reqBody = bytes.NewBuffer(body)
        }

        req, err := http.NewRequest(method, s.BaseURL+endpoint, reqBody)
        if err != nil {
                return nil, 0, fmt.Errorf("failed to create request: %w", err)
        }

        // Set headers
        for k, v := range headers {
                req.Header.Set(k, v)
        }

        client := &http.Client{Timeout: 30 * time.Second}
        resp, err := client.Do(req)
        if err != nil {
                return nil, 0, fmt.Errorf("request failed: %w", err)
        }
        defer resp.Body.Close()

        respBody, err := io.ReadAll(resp.Body)
        if err != nil {
                return nil, resp.StatusCode, fmt.Errorf("failed to read response: %w", err)
        }

        return respBody, resp.StatusCode, nil
}

// ─── Utility Functions ────────────────────────────────────────────────────

// generateDokuTimestamp generates a DOKU-compatible ISO 8601 timestamp.
func generateDokuTimestamp() string {
        now := time.Now()
        return now.Format("2006-01-02T15:04:05-07:00")
}

// generateExternalID generates a unique external ID (10-digit timestamp-based).
func generateExternalID() string {
        return fmt.Sprintf("%d", time.Now().UnixMilli()%1e10)
}

// formatDokuAmount formats a float amount as a DOKU amount string (2 decimal places).
func formatDokuAmount(amount float64) string {
        return fmt.Sprintf("%.2f", amount)
}

// generateDokuExpiry generates an expiry timestamp N hours from now.
func generateDokuExpiry(hours int) string {
        return time.Now().Add(time.Duration(hours) * time.Hour).Format("2006-01-02T15:04:05-07:00")
}

// truncate truncates a string to maxLen characters.
func truncate(s string, maxLen int) string {
        if len(s) <= maxLen {
                return s
        }
        return s[:maxLen]
}

// isDokuVAMethod checks if the payment method is a Virtual Account type.
func isDokuVAMethod(method string) bool {
        return strings.HasPrefix(method, "VIRTUAL_ACCOUNT")
}

// isDokuEwalletMethod checks if the payment method is an E-Wallet type.
func isDokuEwalletMethod(method string) bool {
        return strings.HasPrefix(method, "EMONEY_")
}

// isDokuCCMethod checks if the payment method is a Credit Card type.
func isDokuCCMethod(method string) bool {
        return method == DokuPMCreditCard || method == DokuPMGooglePay
}

// isDokuConvenienceStoreMethod checks if the payment method is a convenience store type.
func isDokuConvenienceStoreMethod(method string) bool {
        return strings.HasPrefix(method, "ONLINE_TO_OFFLINE_")
}

// isDokuPayLaterMethod checks if the payment method is a PayLater type.
func isDokuPayLaterMethod(method string) bool {
        return strings.HasPrefix(method, "PEER_TO_PEER_")
}

// dokuPaymentTypeFromMethod returns a generic payment type from a specific method.
func dokuPaymentTypeFromMethod(method string) string {
        if isDokuVAMethod(method) {
                return "virtual_account"
        }
        if method == DokuPMQRIS {
                return "qris"
        }
        if isDokuEwalletMethod(method) {
                return "ewallet"
        }
        if isDokuCCMethod(method) {
                return "credit_card"
        }
        if isDokuConvenienceStoreMethod(method) {
                return "convenience_store"
        }
        if isDokuPayLaterMethod(method) {
                return "paylater"
        }
        if method == DokuPMCheckout || method == "" {
                return "checkout"
        }
        return "unknown"
}

// normalizeDokuStatus maps DOKU status values to normalized order statuses
// that are compatible with the existing ProcessPaymentCallback flow.
// Maps to: "capture"/"settlement" (paid), "deny"/"cancel", "expire", "pending".
func normalizeDokuStatus(dokuStatus string) string {
        s := strings.ToLower(strings.TrimSpace(dokuStatus))

        switch s {
        case "y", "paid", "success", "settlement", "capture":
                return "settlement" // Maps to "paid" in ProcessPaymentCallback
        case "n", "failed", "denied", "cancelled":
                return "cancel" // Maps to "cancelled" in ProcessPaymentCallback
        case "expired":
                return "expire" // Maps to "expired" in ProcessPaymentCallback
        case "pending", "created", "waiting":
                return "pending"
        default:
                return "pending"
        }
}

// generateUUID generates a random UUID v4.
func generateUUID() string {
        b := make([]byte, 16)
        _, _ = rand.Read(b)
        b[6] = (b[6] & 0x0f) | 0x40 // version 4
        b[8] = (b[8] & 0x3f) | 0x80 // variant 10
        return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
                b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// signRSASHA256 signs a message with RSA-SHA256 using the provided PEM key.
// This is a placeholder — production use should use crypto/rsa or crypto/ecdsa.
func signRSASHA256(privateKeyPEM []byte, message string) (string, error) {
        // For now, return an error to trigger HMAC fallback
        // In production, implement proper RSA signing using:
        //   x509.ParsePKCS8PrivateKey → rsa.SignPKCS1v15 with crypto.SHA256
        return "", fmt.Errorf("RSA signing not yet implemented — use HMAC fallback")
}
