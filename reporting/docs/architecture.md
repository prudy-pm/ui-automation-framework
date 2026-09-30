# Architecture and design decisions

Why the codebase is organized the way it is, and the reasoning behind a few choices a reader would otherwise
have to reverse-engineer. See [`../../README.md`](../../README.md) for what to do; this file is the why.

## How it's built

- **pages/ and api/ mirror each other** — every page object extends `BasePage`, every API client extends
  `BaseApiClient`, so the same pattern applies whether a spec is driving the browser or calling the API
  directly.
- **fixtures/ wires it all into tests** — `pageFixtures.ts` and `apiFixtures.ts` inject page objects/API
  clients via Playwright's fixture system (declare what a test needs, not how it's built), instead of each
  spec constructing them by hand.
- **`data/` vs `reporting/data/`** — `data/` holds test input (JSON, one Excel file, Faker-generated at
  runtime for anything that must stay unpredictable); `reporting/data/featureInventory.json` is a separate,
  hand-kept coverage record, not test input.
- **`utils/` vs reporting-specific code** — shared helpers (faker wrappers, `excelData`, `accountFactory`)
  sit alongside the two reporting-tagging files (`allureTags.ts`, `step.ts`), which are used across every
  spec and page object despite `reporting/` existing as its own folder.

## Authenticated tests

Most UI specs (login, products, cart, newsletter) run as a guest with a fresh, empty browser context every
test. Checkout is different: automationexercise.com requires a logged-in account before it will show the
checkout page at all.

`config/globalSetup.ts` logs in once before the suite, via the UI, as `env.testUser`, and saves the session
with `context.storageState({ path: AUTH_FILE })`. It runs as global setup, not as a test, so it never appears
in reports as a scenario. `checkout.spec.ts` then just declares which session it wants:

```ts
import { AUTH_FILE } from '@config/authFile';

test.use({ storageState: AUTH_FILE });
```

**Why checkout runs on chromium only.** Reusing one account's session means reusing that account's
server-side cart — running the *same* checkout test concurrently across multiple browser projects against
one cart is a real, previously-found source of race-condition bugs. `firefox`/`webkit` both set `testIgnore`
on `tests/ui/checkout/`, so only one instance of that test ever touches the cart at a time, regardless of
worker count. `checkout.spec.ts` still calls `cartPage.clearCart()` as its first step, since the shared cart
carries over between runs.

**Why the shared test account is safe to reuse indefinitely.** No test ever deletes or mutates it — the one
spec that reuses its email for `updateAccount` deliberately sends the wrong HTTP method to test a 405
rejection, not a real update.

## Timeouts and the target site

Three of Playwright's defaults are overridden, and all three exist because of this specific target site, not
as a general-purpose upgrade — automationexercise.com is a free public demo site with no SLA. Confirmed with
a plain `curl -w`, not assumed:

```bash
curl -sS -o /dev/null -w "ttfb: %{time_starttransfer}s\n" https://automationexercise.com/products
# regularly shows 10+ seconds
```

- **`timeout: 45_000`** (default 30s) — a single test previously included the slow time-to-first-byte inside
  its overall budget, plus everything after. Genuinely too tight for this target.
- **`expect.timeout: 10_000`** (default 5s) — an AJAX-driven "Add to cart" modal missed the 5s default while
  the origin was slow — the assertion was correct, the server just hadn't responded.
- **`BasePage.goto()` uses `waitUntil: 'domcontentloaded'`**, not Playwright's default `'load'` — `'load'`
  additionally blocks on every image, font, and third-party ad iframe finishing, none of which any test ever
  touches. Locator actions (`click`/`fill`) still auto-wait for their own target regardless, so this loses no
  real safety.

**If pointing this framework at a different, better-provisioned target, re-check these rather than carrying
them over** — they exist because of this specific site. None of this fixes a genuine connection reset
(`ERR_CONNECTION_RESET`, distinct from a timeout) — only a retry does, which is why
`retries: process.env.CI ? 2 : 1` exists independently of the values above.
