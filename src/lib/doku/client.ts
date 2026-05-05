// ════════════════════════════════════════════════════════════════
// DOKU Payment Gateway — Client-Safe Exports
// ════════════════════════════════════════════════════════════════
// This file ONLY exports constants and pure data — safe for client.
// Server-only functions (token, signature, headers) are in config.ts
// and should be imported directly by API routes, NOT by client components.
// ════════════════════════════════════════════════════════════════

export type { DokuConfig } from './config'
export { DOKU_ENDPOINTS, DOKU_PAYMENT_METHODS, DOKU_PM_GROUPS, DOKU_PM_LABELS, DOKU_RESPONSE_CODES } from './constants'

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
