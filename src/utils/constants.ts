// Payment status constants
export const PAYMENT_STATUS = {
  PENDING: "pending",
  ELIGIBLE: "eligible", 
  PAID: "paid",
  INELIGIBLE: "ineligible"
} as const;

// Eligibility reason constants
export const ELIGIBILITY_REASON = {
  ANC4: "ANC4",
  DELIVERY: "DELIVERY"
} as const;

// Type definitions for TypeScript
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type EligibilityReason = typeof ELIGIBILITY_REASON[keyof typeof ELIGIBILITY_REASON];
