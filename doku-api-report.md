# DOKU Payment Gateway — Comprehensive API Research Report
## For Ticketing System Integration

---

## 1. Overview

DOKU (PT Nusa Satu Inti Artha) is Indonesia's leading payment gateway, providing a wide range of payment methods for merchants. DOKU offers two main integration approaches:

- **DOKU Checkout** — A hosted payment page solution (minimal integration required)
- **Direct API** — Full API integration with two variants:
  - **SNAP** (Service Provider Network Access Protocol) — Compliant with Bank Indonesia's national open API payment standard
  - **Non-SNAP** — Legacy API (archived)

### Key Documentation URLs

| Resource | URL |
|----------|-----|
| API Reference (Developer Portal) | https://developers.doku.com |
| User Documentation | https://docs.doku.com |
| DOKU Dashboard (Production) | https://dashboard.doku.com |
| DOKU Dashboard (Sandbox) | https://sandbox.doku.com |
| Payment Simulator (Sandbox) | https://sandbox.doku.com/integration/simulator |
| DOKU Website | https://www.doku.com |
| Classic API Docs | https://www.doku.com/API/index.html |
| GitHub Organization | https://github.com/PTNUSASATUINTIARTHA-DOKU |
| Postman Collection | Available via Developer Kit at developers.doku.com |

---

## 2. Authentication Mechanism

DOKU uses an OAuth 2.0-based authentication flow with multiple token types and signature verification.

### 2.1 Credentials Required

- **Client ID** (aka `X-PARTNER-ID` or `X-CLIENT-KEY`) — Unique merchant identifier, e.g., `BRN-0259-1678068334526` or `MCH-0008-1296507211683`
- **Secret Key** (aka `clientSecret`) — Used for HMAC signature generation
- **Private Key / Public Key Pair** — Generated using SHA256withRSA for B2B token requests

### 2.2 Credential Retrieval

Credentials are obtained from:
1. **Production**: DOKU Dashboard → Business Account → Service → Integration > API Keys
2. **Sandbox**: Same path on sandbox dashboard
3. Both environments support **Secret Key regeneration**

### 2.3 Token Types

#### B2B Token (Server-to-Server)

Used for all backend API calls (create VA, check status, etc.).

**Endpoint:** `POST /authorization/v1/access-token/b2b`

| Parameter | Direction | Description |
|-----------|-----------|-------------|
| `X-SIGNATURE` | Header | Asymmetric signature: `SHA256withRSA(Private_Key, stringToSign)` where `stringToSign = client_ID + "\|" + X-TIMESTAMP` |
| `X-TIMESTAMP` | Header | UTC time in ISO 8601 format (`yyyy-MM-ddTHH:mm:ssZ`) |
| `X-CLIENT-KEY` | Header | Merchant's `client_id` |
| `Content-Type` | Header | `application/json` |
| `grantType` | Body | `"client_credentials"` |

**Response:**
```json
{
  "responseCode": "2007300",
  "responseMessage": "Successful",
  "accessToken": "eyJhbGciOiJSUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "additionalInfo": ""
}
```

- **Token expiry**: 900 seconds (15 minutes)
- **Token type**: Bearer
- **Response code format**: HTTP status code + service code + case code

#### B2B2C Token (Server-to-Server-to-Customer)

Used for customer-facing operations (e-wallet balance inquiry, payment authorization).

**Endpoint:** `POST /authorization/v1/access-token/b2b2c`

Requires additional parameters including customer authorization code and provides a customer access token.

### 2.4 X-SIGNATURE Generation (Symmetric — for API calls)

For API calls (after obtaining B2B token):

```
Algorithm: HMAC_SHA512(clientSecret, stringToSign)
stringToSign = HTTPMethod + ":" + EndpointUrl + ":" + AccessToken + ":" + Lowercase(HexEncode(SHA-256(minify(RequestBody)))) + ":" + TimeStamp
```

**Notes:**
- The full URL endpoint includes all parameters in the associated URL
- If there is no Request Body, an empty string is used for the body hash

### 2.5 Standard Request Headers for API Calls

| Header | Required | Description |
|--------|----------|-------------|
| `X-TIMESTAMP` | Yes | Client's current local time in `yyyy-MM-ddTHH:mm:ssZ` or `yyyy-MM-ddTHH:mm:ssXXX` format |
| `X-SIGNATURE` | Yes | HMAC_SHA512 signature (see formula above) |
| `X-PARTNER-ID` | Yes | Merchant's Client ID |
| `X-EXTERNAL-ID` | Yes | Numeric string, unique reference number per day (request ID) |
| `CHANNEL-ID` | Yes (VA) | Channel ID, e.g., `H2H` for Virtual Account |
| `Authorization` | Yes | `Bearer {access_token}` |
| `Content-Type` | Yes | `application/json` |

---

## 3. API Endpoints

### 3.1 Environment Base URLs

| Environment | Base URL |
|-------------|----------|
| **Sandbox** | `https://api-sandbox.doku.com` |
| **Production** | `https://api.doku.com` |

### 3.2 Authentication Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/authorization/v1/access-token/b2b` | Get B2B access token (server-to-server) |
| `POST` | `/authorization/v1/access-token/b2b2c` | Get B2B2C access token (for customer operations) |

### 3.3 Virtual Account Endpoints (SNAP)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va` | Create Virtual Account (DGPC & MGPC) |
| `POST` | `/virtual-accounts/bi-snap-va/v1.1/transfer-va/delete-va` | Delete Virtual Account |
| `PUT` | `/virtual-accounts/bi-snap-va/v1.1/transfer-va/update-va` | Update Virtual Account |
| `POST` | `/virtual-accounts/bi-snap-va/v1.1/transfer-va/direct-inquiry` | Direct Inquiry (DIPC) |
| `POST` | `/orders/v1.0/transfer-va/status` | Check VA Transaction Status |

**VA per-bank variants** are documented under:
- BSI VA: `/virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va`
- BCA, BNI, BRI, Mandiri, Permata, BTN, BNC, BSS, Danamon: Similar paths with bank-specific details

### 3.4 E-Wallet Endpoints (Direct Debit / SNAP)

#### OVO

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/direct-debit/core/v1/registration-account-binding` | Account Binding |
| `POST` | `/direct-debit/core/v1/balance-inquiry` | Balance Inquiry |
| `POST` | `/direct-debit/core/v1/payment` | Payment (One-Time & Recurring) |
| `POST` | `/direct-debit/core/v1/refund` | Online Refund |
| `POST` | `/direct-debit/core/v1/account-unbinding` | Account Unbinding |

#### DANA, ShopeePay
- Similar direct-debit paths with channel-specific parameters
- Channels: `EMONEY_OVO_SNAP`, `EMONEY_DANA`, `EMONEY_SHOPEE_PAY`

### 3.5 Direct Debit Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/direct-debit/core/v1/registration-account-binding` | Account Binding |
| `POST` | `/direct-debit/core/v1/balance-inquiry` | Balance Inquiry |
| `POST` | `/direct-debit/core/v1/payment` | Payment |
| `POST` | `/direct-debit/core/v1/refund` | Refund |

### 3.6 Credit Card (KKI CPTS)

- Host-to-Host integration with tokenization
- Tokenization API for binding cards
- Payment/charge API with token

### 3.7 QRIS

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/qr/...` | Create QRIS payment |
| `POST` | `/orders/v1.0/qr/status` | Check QRIS Transaction Status |

### 3.8 Check Status API (SNAP)

| Method | Path (Sandbox) | Path (Production) | Description |
|--------|------|------|-------------|
| `POST` | `https://api-sandbox.doku.com/orders/v1.0/transfer-va/status` | `https://api.doku.com/orders/v1.0/transfer-va/status` | Check VA status |
| `POST` | `/orders/v1.0/direct-debit/status` | `/orders/v1.0/direct-debit/status` | Check Direct Debit/E-Wallet status |
| `POST` | `/orders/v1.0/ewallet/status` | `/orders/v1.0/ewallet/status` | Check E-Wallet status |

**IMPORTANT**: Hit Check Status API **after 60 seconds** after payment completion to get accurate results.

### 3.9 DOKU Checkout API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/checkout/v1/payment` | Create checkout payment |
| (Various) | `/orders/v1.0/.../status` | Check order status |

---

## 4. Request/Response Formats

### 4.1 Standard Request Body (Virtual Account — Create VA)

```json
{
  "partnerServiceId": " 6059",
  "customerNo": "0",
  "virtualAccountNo": " 60590",
  "virtualAccountName": "Customer Name",
  "virtualAccountEmail": "customer.email@mail.com",
  "virtualAccountPhone": "0816291271826",
  "trxId": "23219829713",
  "totalAmount": {
    "value": "11500.00",
    "currency": "IDR"
  },
  "additionalInfo": {
    "channel": "VIRTUAL_ACCOUNT_BSI",
    "virtualAccountConfig": {
      "reusableStatus": true,
      "minAmount": "10000.00",
      "maxAmount": "5000000.00"
    }
  },
  "virtualAccountTrxType": "C",
  "expiredDate": "2023-01-01T10:55:00+07:00",
  "freeText": [
    { "english": "Free text", "indonesia": "Tulisan Bebas" }
  ]
}
```

### 4.2 Standard Response (Create VA — 200 Success)

```json
{
  "responseCode": "2002700",
  "responseMessage": "Successful",
  "virtualAccountData": {
    "partnerServiceId": " 6059",
    "customerNo": "00000000000000000001",
    "virtualAccountNo": " 605900000000000000000001",
    "virtualAccountName": "Customer Name",
    "virtualAccountEmail": "customer.email@mail.com",
    "virtualAccountPhone": "081293912081",
    "trxId": "23219829713",
    "totalAmount": {
      "value": "11500.00",
      "currency": "IDR"
    },
    "virtualAccountTrxType": "C",
    "expiredDate": "2023-01-01T10:55:00+07:00",
    "additionalInfo": {
      "channel": "VIRTUAL_ACCOUNT_BSI",
      "howToPayPage": "https://app.doku.com/how-to-pay/virtual-account/bsi/...",
      "howToPayApi": "https://api.doku.com/pay-instruction/bsi/..."
    }
  }
}
```

### 4.3 Response Code Format

All response codes follow the format: **HTTP Status Code + Service Code + Case Code**

Example: `2002700` → `200` (HTTP OK) + `27` (Service Code for VA) + `00` (Case Code for Success)

### 4.4 Content Type

All API requests and responses use `application/json`.

---

## 5. Payment Methods Supported

### 5.1 Virtual Account (Bank Transfer)

| Payment Method | Checkout Value | Supported Billing Types |
|---------------|----------------|------------------------|
| BCA VA | `VIRTUAL_ACCOUNT_BCA` | FIX_BILL, NO_BILL, BILL_VARIABLE_AMOUNT |
| Mandiri VA | `VIRTUAL_ACCOUNT_BANK_MANDIRI` | FIX_BILL, NO_BILL |
| BSI VA | `VIRTUAL_ACCOUNT_BANK_SYARIAH_MANDIRI` | FIX_BILL, NO_BILL |
| BRI VA | `VIRTUAL_ACCOUNT_BRI` | FIX_BILL, NO_BILL |
| BNI VA | `VIRTUAL_ACCOUNT_BNI` | FIX_BILL, NO_BILL, PARTIAL_AMOUNT |
| Permata VA | `VIRTUAL_ACCOUNT_BANK_PERMATA` | FIX_BILL, NO_BILL |
| CIMB VA | `VIRTUAL_ACCOUNT_BANK_CIMB` | FIX_BILL, NO_BILL, PARTIAL_AMOUNT |
| Danamon VA | `VIRTUAL_ACCOUNT_BANK_DANAMON` | FIX_BILL, NO_BILL, PARTIAL_AMOUNT |
| DOKU VA | `VIRTUAL_ACCOUNT_DOKU` | FIX_BILL, NO_BILL |
| BTN VA | `VIRTUAL_ACCOUNT_BTN` | FIX_BILL, NO_BILL |
| BNC VA | `VIRTUAL_ACCOUNT_BNC` | FIX_BILL, NO_BILL |
| BSS VA | (available) | FIX_BILL, NO_BILL |
| Maybank VA | (available) | FIX_BILL, NO_BILL |

**VA Features:**
- **DGPC** (DOKU Generated Payment Code): DOKU generates the VA number. Suitable for e-commerce.
- **MGPC** (Merchant Generated Payment Code): Merchant generates the VA number. Suitable for top-up business.
- **DIPC** (Direct Inquiry Payment Code): VA registered on merchant side. Customer inquiry forwarded to merchant.

**VA Number Components:**
- BIN (Bank Identification Number) + Unique VA Number
- Lengths vary by bank (16-28 digits total)
- BIN rules depend on partnership model (Aggregator vs Direct)

**Billing Types:**
- `FIX_BILL` — Closed amount, full payment only
- `NO_BILL` — Customer can pay any amount
- `BILL_VARIABLE_AMOUNT` — Customer pays within a predetermined range
- `PARTIAL_AMOUNT` — Customer pays any amount up to the bill amount

### 5.2 E-Wallet

| Payment Method | Checkout Value | API Channel |
|---------------|----------------|-------------|
| OVO | `EMONEY_OVO` | `EMONEY_OVO_SNAP` |
| ShopeePay | `EMONEY_SHOPEE_PAY` | (direct-debit) |
| DOKU Wallet | `EMONEY_DOKU` | — |
| DANA | `EMONEY_DANA` | (direct-debit) |
| LinkAja | `EMONEY_LINKAJA` | — |

**E-Wallet Integration Steps (e.g., OVO):**
1. Account Binding (customer OTP/PIN verification)
2. Balance Inquiry (check sufficient funds)
3. Payment (One-Time or Recurring)
4. Payment Notification
5. Additional: Online Refund, Account Unbinding

### 5.3 Credit Card

| Payment Method | Checkout Value |
|---------------|----------------|
| Credit Card | `CREDIT_CARD` |
| Google Pay (CC) | `GOOGLE_PAY` |
| KKI (Kartu Kredit Indonesia) | `KARTU_KREDIT_INDONESIA` |

### 5.4 QRIS (QR Payment)

| Payment Method | Checkout Value |
|---------------|----------------|
| QRIS | `QRIS` |

> **Note:** QRIS is NOT supported in DOKU Sandbox. No QRIS simulator available.

### 5.5 Convenience Store

| Payment Method | Checkout Value |
|---------------|----------------|
| Alfamart/Alfamidi/Dan+Dan | `ONLINE_TO_OFFLINE_ALFA` |
| Indomaret | `ONLINE_TO_OFFLINE_INDOMARET` |

### 5.6 PayLater

| Payment Method | Checkout Value |
|---------------|----------------|
| Akulaku | `PEER_TO_PEER_AKULAKU` |
| Kredivo | `PEER_TO_PEER_KREDIVO` |
| Indodana | `PEER_TO_PEER_INDODANA` |

### 5.7 Direct Debit

| Payment Method | Checkout Value |
|---------------|----------------|
| BRI Direct Debit | `DIRECT_DEBIT_BRI` |

### 5.8 Digital Banking

| Payment Method | Checkout Value |
|---------------|----------------|
| Jenius Pay | `JENIUS_PAY` |

---

## 6. Payment Flow — Step by Step

### 6.1 SNAP Direct API Flow (General)

```
1. Merchant Backend → DOKU API: Get B2B Token
   POST /authorization/v1/access-token/b2b
   (with asymmetric RSA signature)

2. Merchant Backend → DOKU API: Create Payment (e.g., Create VA)
   POST /virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va
   (with B2B token + HMAC signature)

3. DOKU → Merchant Backend: Response with VA Number

4. Merchant → Customer: Display VA Number / Payment Page

5. Customer → Bank/E-Wallet App: Make Payment

6. Bank → DOKU: Payment Confirmation

7. DOKU → Merchant Backend: HTTP Notification (Webhook)

8. Merchant Backend → DOKU API: Check Status (after 60 seconds)
   POST /orders/v1.0/transfer-va/status

9. Merchant → Customer: Confirm Payment Success
```

### 6.2 E-Wallet (OVO) Flow

```
1. Get B2B Token
2. Account Binding → Customer verifies with OTP + PIN → Returns redirect URL
3. Balance Inquiry (requires B2B2C token for customer authorization)
4. Payment Request
5. Payment Notification (webhook)
6. Check Status
```

### 6.3 DOKU Checkout Flow

```
1. Merchant Backend → DOKU: Create Checkout Payment Request
2. DOKU → Merchant: Returns payment URL
3. Merchant → Customer: Redirect to DOKU Checkout Page
4. Customer selects payment method and pays on DOKU page
5. DOKU → Customer: Redirects back to merchant success/fail URL
6. DOKU → Merchant Backend: HTTP Notification (webhook)
```

---

## 7. Webhook / Payment Notification

### 7.1 Configuration

Webhooks are configured per payment method via the DOKU Dashboard:

**Path:** Settings → Payment Settings → {Payment Method}

- Each payment method (VA, Cards, E-Wallet, Convenience Store, PayLater, Direct Debit, Digital Banking, QRIS) has its own webhook configuration
- Merchants set a payment notification URL (endpoint URL)
- **Malaysia Account**: Supports a single webhook endpoint for all selected payment channels
- Payment channels cannot be reused once assigned to an existing webhook
- **If webhook is deleted, inactive, or has no URL configured, notifications are NOT sent**

### 7.2 Notification Flow

1. Customer completes payment at the bank/e-wallet/app
2. Bank confirms payment to DOKU
3. DOKU sends HTTP POST notification to the merchant's configured webhook URL
4. The notification payload contains transaction details including status, amount, VA number, etc.

### 7.3 Notification Response

The response body is similar to the Check Status API response:
```json
{
  "responseCode": "2002600",
  "responseMessage": "Successful",
  "virtualAccountData": {
    "paymentFlagReason": {
      "english": "Paid",
      "indonesia": "Terbayar"
    },
    "partnerServiceId": " 12345",
    "customerNo": "70020000342",
    "virtualAccountNo": " 1234570020000342",
    "paidAmount": {
      "value": "200000.00",
      "currency": "IDR"
    },
    "billDetails": [...]
  },
  "additionalInfo": {
    "acquirer": { "id": "BRI" },
    "trxId": "Testjess12345"
  }
}
```

---

## 8. Error Codes

### 8.1 Response Code Format

All response codes follow: **HTTP_Status_Code + Service_Code + Case_Code**

### 8.2 HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Successful |
| 400 | Bad Request |
| 401 | Unauthorized / Forbidden |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |
| 504 | Gateway Timeout |

### 8.3 Service Codes (Examples)

| Service Code | Payment Channel |
|-------------|----------------|
| 07 | E-Wallet |
| 11 | Direct Debit |
| 26 | Virtual Account (Check Status) |
| 27 | Virtual Account (Create/Manage) |
| 73 | Authorization/B2B Token |

### 8.4 Case Codes (Examples)

| Case Code | Meaning |
|-----------|---------|
| 00 | Successful |
| 01 | General Error |
| 03 | Invalid Parameter |
| 04 | Transaction Not Found |
| 05 | Timeout |
| 06 | Duplicate |
| 07 | Insufficient Balance |
| 08 | Account Blocked |
| 14 | Invalid Signature |

### 8.5 Common Error Responses

| Response Code | Message |
|---------------|---------|
| `4017300` | "Unauthorized. Unknown Client" |
| `4017300` | "Unauthorized. Signature" |
| `4017300` | "Unauthorized. Token Invalid" |

### 8.6 Reference Documentation

Full error code reference: https://developers.doku.com/get-started-with-doku-api/response-code/http-status-and-case-code

---

## 9. SDK & Libraries

### 9.1 Official SDK (by DOKU)

All official SDKs are available on GitHub: https://github.com/PTNUSASATUINTIARTHA-DOKU

| Language | Repository | Description |
|----------|-----------|-------------|
| **PHP** | [doku-php-library](https://github.com/PTNUSASATUINTIARTHA-DOKU/doku-php-library) | Server-side PHP SDK |
| **Node.js** | [doku-nodejs-library](https://github.com/PTNUSASATUINTIARTHA-DOKU/doku-nodejs-library) | Server-side Node.js SDK |
| **Python** | [doku-python-library](https://github.com/PTNUSASATUINTIARTHA-DOKU/doku-python-library) | Python SDK |
| **Java** | [doku-java-library](https://github.com/PTNUSASATUINTIARTHA-DOKU/doku-java-library) | Java SDK |

These SDKs:
- Provide access to DOKU APIs
- Ensure compliance with Bank Indonesia (BI) regulations
- Simplify signature generation and token management
- Support SNAP API format

### 9.2 Postman Collection

Available via: Developer Kit → Postman Collection at https://developers.doku.com

### 9.3 DOKU MCP Server

DOKU also provides a Model Context Protocol (MCP) Server for AI-powered payment integration:
- URL: https://developers.doku.com/accept-payments/doku-mcp-server
- Enables AI chatbots to generate payment requests, send QR codes, and handle webhooks

---

## 10. Sandbox / Test Environment

### 10.1 Sandbox URLs

| Resource | URL |
|----------|-----|
| Sandbox API | `https://api-sandbox.doku.com` |
| Sandbox Dashboard | `https://sandbox.doku.com` |
| Payment Simulator | `https://sandbox.doku.com/integration/simulator` |
| Demo Site | Available via developers.doku.com (Test on DOKU Demo Site link) |

### 10.2 Payment Simulator

The sandbox provides a Payment Simulator at `https://sandbox.doku.com/integration/simulator` with simulators for:
- Virtual Account
- Credit Card
- Direct Debit
- E-Money
- Online to Offline (Convenience Store)
- Direct Transfer
- Rekening

### 10.3 Sandbox Credentials

- Sandbox credentials (Client ID & Secret Key) are retrieved the same way as production, via the Sandbox Dashboard
- Navigate to: Business Account → Service → Integration > API Keys
- Both environments support Secret Key regeneration

### 10.4 Sandbox Limitations

- **QRIS is NOT supported in sandbox** — No QRIS credentials or simulator available
- Other payment methods have full simulator support

### 10.5 Important Testing Notes

- **Hit Check Status API after 60 seconds** after payment completion for accurate results
- Transaction status: "Pending" means waiting for customer payment — wait for HTTP Notification or call Check Status API

---

## 11. Integration Approaches Summary

### 11.1 DOKU Checkout (Recommended for Quick Integration)

- **Minimal code** — Just create a payment request and redirect customer
- Supports: Virtual Account, Credit Card, QRIS, Convenience Store, E-Wallet, PayLater, Direct Debit, Digital Banking
- Single API call to create payment → Get redirect URL
- Payment method filtering via `payment.payment_method_types` array

### 11.2 Direct API — SNAP (Recommended for Full Control)

- Full API control over payment lifecycle
- Bank Indonesia compliant
- Requires B2B token + HMAC signature for every request
- Supports all payment methods
- More complex but offers maximum flexibility

### 11.3 Direct API — Non-SNAP (Legacy / Archived)

- Older API format, being phased out
- Available for reference in the Archive section

---

## 12. Key DOKU API Reference Pages Found

| Page | URL |
|------|-----|
| API Reference Home | https://developers.doku.com |
| Get Started with DOKU API | https://developers.doku.com/get-started-with-doku-api |
| Retrieve Payment Credential | https://developers.doku.com/get-started-with-doku-api/retrieve-payment-credential |
| User Registration | https://developers.doku.com/get-started-with-doku-api/user-registration |
| SNAP Integration Guide | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide |
| Get Token API (B2B) | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/get-token-api/b2b |
| Get Token API (B2B2C) | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/get-token-api/b2b2c |
| SNAP Signature Component | https://developers.doku.com/get-started-with-doku-api/signature-component/snap |
| Virtual Account (Overview) | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/virtual-account |
| BSI Virtual Account | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/virtual-account/bsi-virtual-account |
| BCA Virtual Account | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/virtual-account/bca-virtual-account |
| BRI Virtual Account | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/virtual-account/bri-virtual-account |
| BNI Virtual Account | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/virtual-account/bni-virtual-account |
| Mandiri Virtual Account | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/virtual-account/mandiri-virtual-account |
| Permata Virtual Account | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/virtual-account/permata-virtual-account |
| Danamon Virtual Account | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/virtual-account/danamon-virtual-account |
| BTN Virtual Account | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/virtual-account/btn-virtual-account |
| BNC Virtual Account | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/virtual-account/bnc-virtual-account |
| E-Wallet (OVO) | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/e-wallet/ovo |
| E-Wallet (DANA) | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/e-wallet/dana |
| E-Wallet (ShopeePay) | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/e-wallet/shopeepay |
| Direct Debit | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/direct-debit |
| KKI CPTS (Credit Card) | https://developers.doku.com/accept-payments/direct-api/snap/integration-guide/kartu-kredit-indonesia-cepat-secure-kki-cpts |
| DOKU Checkout Integration | https://developers.doku.com/accept-payments/doku-checkout/integration-guide/backend-integration |
| DOKU Checkout Payment Methods | https://developers.doku.com/accept-payments/doku-checkout/supported-payment-methods |
| DOKU Checkout Settings | https://developers.doku.com/accept-payments/doku-checkout/checkout-settings |
| Check Status API (SNAP) | https://developers.doku.com/get-started-with-doku-api/check-status-api/snap |
| Error / Response Codes | https://developers.doku.com/get-started-with-doku-api/response-code/http-status-and-case-code |
| Libraries and SDK | https://developers.doku.com/developer-kit/libraries-and-sdk |
| Postman Collection | https://developers.doku.com (Developer Kit section) |
| DOKU MCP Server | https://developers.doku.com/accept-payments/doku-mcp-server |
| Webhook Configuration | https://docs.doku.com/get-started/manage-business/set-up-integration/webhook-payment-notification |
| Payment Methods (Docs) | https://docs.doku.com/payment-methods |
| Manage Payment Methods | https://docs.doku.com/get-started/manage-business/manage-payment-methods |
| Glossary | https://docs.doku.com/miscellaneous/glossary |
| SNAP Migration | https://docs.doku.com/miscellaneous/snap-migration |

---

## 13. Additional Services (Beyond Payments)

| Service | Description |
|---------|-------------|
| **Domestic Payouts** | Disburse funds to bank accounts |
| **Cash Out** | Withdrawal from DOKU ecosystem |
| **Wallet as a Service** | Embedded wallet capabilities |
| **Sub-Account** | Multi-tenant account management |
| **Embedded Wallet** | Wallet functionality embedded in merchant apps |
| **Partner API** | Partnership integration |
| **Payout Link** | Generate payment links for payouts |
| **FLEXIBILL** | Account billing solutions |
| **PAYCHAT API** | WhatsApp-based payment requests |
| **Kirim DOKU** | Send money feature |
| **Juragan DOKU** | Agent management |
| **DOKU e-Wallet** | DOKU's own e-wallet product |

---

## 14. Important Notes for Ticketing System Integration

1. **SNAP compliance** — DOKU's SNAP API follows Bank Indonesia's national open API standard. This is the recommended integration path.

2. **Token management** — B2B tokens expire in 15 minutes. Implement token caching and refresh logic.

3. **Signature generation is complex** — Two types: Asymmetric (RSA for token) and Symmetric (HMAC-SHA512 for API calls). Use the official SDKs to simplify.

4. **VA is the simplest starting point** — For a ticketing system, Virtual Account (DGPC) is the easiest to integrate: create VA → display to customer → wait for notification → check status.

5. **Recommended payment methods for ticketing**:
   - Virtual Account (all banks) — Most popular for Indonesian ticketing
   - QRIS — Growing adoption, but not testable in sandbox
   - E-Wallet (OVO, DANA, ShopeePay) — Requires customer binding flow
   - Credit Card — Requires PCI compliance considerations

6. **Webhook is critical** — Always configure webhook for payment notifications. Also implement Check Status API as a fallback (call after 60 seconds).

7. **Idempotency** — DOKU supports idempotency to prevent duplicate transactions.

8. **Use official SDKs** — Available for PHP, Node.js, Python, and Java to handle signature generation and token management.

---

*Report generated from research of DOKU documentation at developers.doku.com and docs.doku.com*
*Last updated: 2025*
