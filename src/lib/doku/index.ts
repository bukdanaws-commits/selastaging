// ════════════════════════════════════════════════════════════════
// DOKU Payment Gateway — Client SDK
// ════════════════════════════════════════════════════════════════
// Exports all DOKU utilities in one place.
// Import with: import { dokuConfig, isDokuSandbox, ... } from '@/lib/doku'
// ════════════════════════════════════════════════════════════════

export {
  type DokuConfig,
  dokuConfig,
  isDokuSandbox,
  isDokuConfigured,
  DOKU_ENDPOINTS,
  DOKU_PAYMENT_METHODS,
  DOKU_PM_GROUPS,
  DOKU_PM_LABELS,
  DOKU_RESPONSE_CODES,
  generateDokuSignature,
  generateDokuRSASignature,
  generateDokuTimestamp,
  generateExternalId,
  getDokuB2BToken,
  buildDokuHeaders,
  formatDokuAmount,
  generateDokuExpiry,
} from './config'

// Frontend payment helpers
export {
  type PaymentMethodInfo,
  PAYMENT_CATEGORY_CONFIG,
  getPaymentMethodInfo,
  getPaymentCategoryLabel,
  redirectToDokuCheckout,
  formatVANumber,
  getQRCodeUrl,
  isInlinePaymentMethod,
  isRedirectPaymentMethod,
  getPaymentInstructions,
  formatExpiryCountdown,
} from './payment'
