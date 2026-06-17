// SERVER ONLY — never import in client-side components
// Only accessed inside Supabase Edge Functions
// Update values here — they propagate to all email sends automatically

export const PAYMENT_DETAILS = {
  sendwave: {
    methodLabel:    "Sendwave",
    tags:           ["ZERO FEES", "~30 SECONDS"],
    descriptor:     "Fastest · USA, UK, Canada, EU",
    recipientName:  "Robinson Nyamongo",
    mPesaNumber:    "+254745837077",
    country:        "Kenya",
    delivery:       "M-Pesa · Instant",
    sendFrom:       "USA, UK, Canada, EU",
    instruction:    "Download the Sendwave app → select Kenya → enter name & number above → Send. No transfer fees ever.",
    website:        "sendwave.com",
  },

  taptap: {
    methodLabel:    "TapTap Send / WorldRemit",
    tags:           ["NO FEES", "130+ COUNTRIES"],
    descriptor:     "Widest global coverage",
    recipientName:  "Robinson Nyamongo",
    mPesaNumber:    "+254745837077",
    country:        "Kenya",
    delivery:       "M-Pesa / Bank",
    sendFrom:       "UK, EU, USA, CA, AU+",
    instruction:    "Same company as Zepit — use either app. Enter name & number above → Send. No fees.",
    website:        "taptapsend.com",
  },

  westernUnion: {
    methodLabel:    "Western Union",
    tags:           ["200+ COUNTRIES", "CASH OR CARD"],
    descriptor:     "Walk-in or online",
    receiverName:   "Robinson Nyamongo",
    country:        "Kenya",
    city:           "Nairobi",
    deliverTo:      "M-Pesa",
    mPesaNumber:    "+254745837077",
    speed:          "Minutes to M-Pesa",
    currencies:     "USD · EUR · GBP",
    instruction:    "Use the WU app, website, or any walk-in agent. Choose M-Pesa as the delivery method. Share your MTCN tracking number with us after sending.",
    website:        "westernunion.com",
  },

  // INDIRECT — admin generates a Payoneer "Request a Payment" invoice and pastes
  // the link in the dashboard; the system emails it to the client. No static
  // account details are shown to the client for indirect methods.
  payoneer: {
    methodLabel:    "Payoneer",
    indirect:       true,
    tags:           ["SECURE LINK", "CARD OR BANK"],
    descriptor:     "Pay by a secure Payoneer link",
    speed:          "Instant once paid",
    currencies:     "USD · EUR · GBP",
    instruction:    "We'll email you a secure Payoneer payment link with the amount pre-filled — just open it and pay.",
    website:        "payoneer.com",
  },

  // INDIRECT — admin creates a Wise "Request money" link and pastes it.
  wise: {
    methodLabel:    "Wise",
    indirect:       true,
    tags:           ["SECURE LINK", "LOW FX FEES"],
    descriptor:     "Pay by a secure Wise link",
    speed:          "Instant once paid",
    currencies:     "USD · EUR · GBP + 40 more",
    instruction:    "We'll email you a secure Wise payment link with the amount pre-filled — just open it and pay.",
    website:        "wise.com",
  },

  skrill: {
    methodLabel:    "Skrill",
    tags:           ["40 CURRENCIES", "E-WALLET"],
    descriptor:     "E-commerce & digital payments",
    accountEmail:   "Robinsonogatoh@gmail.com",
    accountName:    "Robinson Nyamongo",
    howToPay:       "Send Money → Paste email",
    speed:          "Instant",
    currencies:     "USD · EUR · GBP + 37 more",
    instruction:    "No bank account needed — paste the email above and send. Skrill-to-Skrill transfers are instant & free.",
    website:        "skrill.com",
  },

  mpesa: {
    methodLabel:    "M-Pesa",
    tags:           ["KENYA ONLY", "INSTANT", "FREE"],
    descriptor:     "Kenya-based clients only",
    registeredName: "Robinson Nyamongo",
    phoneNumber:    "+254745837077",
    speed:          "Instant",
    currency:       "KES",
    instruction:    "Send directly via the M-Pesa menu or Safaricom app. Always confirm the name matches before sending.",
    website:        "safaricom.co.ke",
    restriction:    "Kenya-based clients only",
    countryRequired: "Kenya",
  },
} as const;

export type PaymentMethod = keyof typeof PAYMENT_DETAILS;

// Indirect methods require the admin to generate a platform invoice and paste a
// payment link; direct methods email static account details immediately.
export const INDIRECT_METHODS: PaymentMethod[] = ["wise", "payoneer"];
export function isIndirect(method: string): boolean {
  return INDIRECT_METHODS.includes(method as PaymentMethod);
}

// Human-readable label for any method key (falls back to the key itself).
export function methodLabel(method: string): string {
  return (PAYMENT_DETAILS as Record<string, { methodLabel?: string }>)[method]?.methodLabel ?? method;
}
