// Single source of truth for the live-catalog product cart.spec.ts,
// productQuantity.spec.ts, and checkout.spec.ts all depend on. This is a
// public third-party site (automationexercise.com) with no seeding endpoint,
// so unlike an owned backend we can't provision fixture data -- centralizing
// the literal here is the next best thing: one place to update if the
// catalog changes, and one place config/globalSetup.ts can verify against
// before the suite runs instead of every spec typing the same guess.
export const CATALOG_PRODUCT = {
  searchTerm: 'top',
  name: 'Blue Top',
  price: 'Rs. 500',
} as const;
