# What This Project Actually Does (No Jargon)

This document explains every file in this project in plain English: what it contains, how it works, and why it exists. It's written for someone who doesn't code, so technical README.md is the place to go for setup commands and deep technical rationale — this is the place to go to understand the *shape* of the thing.

## The one-paragraph version

This project hires a tireless, very fast robot assistant to click around a shopping website (automationexercise.com) exactly the way a real person would — search for a product, add it to a cart, pay, log in, subscribe to a newsletter — and check that everything behaves correctly every single time. It does this dozens of times, across three different browsers, in a couple of minutes, and then writes up a report of what passed, what failed, and — if something failed — a screenshot of exactly what the screen looked like at that moment.

## The running analogy this whole guide uses

Think of the assistant putting on a play, over and over, on three different stages (Chrome, Firefox, Safari):

| Real-world role | In this project | What it actually does |
|---|---|---|
| **Cheat sheets for each room of the building** | Page Objects (`pages/`) | "The login button is here, the price shows up there" — one cheat sheet per screen |
| **The stage crew** | Fixtures (`fixtures/`) | Sets up everything the assistant needs *before* a scene starts, and tidies up after — see the deep dive below, this is the part that caused confusion last time |
| **A direct phone line to the back office** | API Clients (`api/`) | Skips the website's screens entirely and talks straight to its data system — much faster, used for setup/teardown and for testing rules that don't need a screen at all |
| **The props and cast list** | Data files (`data/`) | What values get typed into forms — some fixed, some pulled from a spreadsheet, some invented fresh every run |
| **The settings envelope** | Config (`config/`, `.env`) | The real website address and the test account's login details — kept in a sealed envelope, never left lying around in the shared script |
| **The after-action report** | Reporting (Playwright HTML report, Allure, Teams alert) | What happened, with evidence, plus a trend line over time |

---

## Fixtures — the part worth slowing down for

**This is the one that tripped up the "fixtures vs. pages" discussion, so here it is from scratch, with no assumed knowledge.**

A **Page Object** (in `pages/`) is a cheat sheet for one screen. It knows things like "the search box is called this" and "click here to add to cart." It does **not** know anything about *when* it gets used, what should happen before it, or what should happen after. It's purely "here's how you interact with this one screen."

A **Fixture** (in `fixtures/`) is completely different: it's the stage crew that runs *before* a test even starts its first line, and *after* the test finishes — and it hands the test whatever tools it asked for, already assembled.

Here's a concrete, no-jargon example. The checkout test needs to be logged in before it can even see a checkout screen. Without a fixture, *every single checkout test* would have to, at its own start:
1. Create a temporary test account (so no two test runs interfere with each other)
2. Log in as that account
3. Remember to delete that account at the end, even if the test itself failed halfway through

That's the same three steps, copy-pasted into every test, and if one test forgets step 3, a real leftover account sits on the real website forever. Instead, `fixtures/accountFixtures.ts` does those three steps itself, automatically, and hands the test a browser that's *already logged in*. The test itself only has to contain the one thing that's actually being checked — "does checkout work" — not the housekeeping around it.

So, the short version to say out loud in a discussion:
> "Page objects describe **a screen**. Fixtures describe **what gets prepared before a test runs, and cleaned up after** — they're what make the test's own code contain only the thing being tested, not the setup around it."

A second, smaller benefit worth mentioning: fixtures can hand a test *exactly* what it asks for, and nothing else. A test that only needs the cart page never has to know a login page object even exists — it just asks for `cartPage` by name, and the fixture builds it. This is why adding fixtures reduced repetition across the test files rather than just moving it somewhere else.

### The three fixture files, specifically

- **`fixtures/pageFixtures.ts`** — Hands every UI test whichever cheat-sheets (page objects) it asks for, already built and pointed at the same browser tab. It also quietly blocks advertising network requests for every single test — a rule that lives in exactly one place, applied everywhere, with zero tests aware it's happening.
- **`fixtures/apiFixtures.ts`** — Same idea, but for tests that talk directly to the website's back office (the API) instead of clicking through screens. It opens that direct phone line before the test and hangs it up after, so no test has to remember to close its own connection.
- **`fixtures/accountFixtures.ts`** — The most involved one. Once per "worker" (a worker is one of the parallel lanes the robot assistant runs in — think of it as one extra actor performing the same play simultaneously so the whole run finishes faster), it: creates one real, throwaway account on the live website via the direct phone line, logs into it once, saves that logged-in session, and deletes the account again once that worker is completely done — even if a test in between failed. Every checkout test in that worker then starts *already logged in*, for free.

**Why per-worker, not one shared login for everyone:** this used to be one single shared test account for every parallel lane. Three lanes fighting over one shopping cart at the same time corrupted the cart's total — a real bug that was seen and reproduced, not a guess. Giving each lane its own throwaway account removed the fight entirely.

---

## Folder-by-folder guide

### `pages/` — one cheat sheet per screen

Every file here describes one screen (or, in one case, one reusable chunk of a screen) of the website: what's on it, and the handful of things a person can do there. None of them contain any actual test checks — they're purely "how do I interact with this."

- **`BasePage.ts`** — Not a real screen; it's the shared toolbox every other page object borrows from. It holds the basic moves every screen needs (click something, type into a box, wait for something to appear, check something is or isn't visible) so those moves are written once, correctly, instead of copied into nine different files. It also holds the sensible pause-and-wait rules described later in the [Reporting & Reliability](#reliability--how-flaky-failures-are-avoided) section.
- **`LoginPage.ts`** — The login screen: type an email/password, submit, and check whether login succeeded or an error appeared.
- **`SignupPage.ts`** — The signup form, which happens to live on the same page as login on this website, but is treated as its own thing because "creating an account" and "logging into an existing one" are different features, not the same feature in disguise.
- **`ProductsPage.ts`** — The products listing/search screen: search for something, add the first result to the cart, open a specific product.
- **`ProductDetailPage.ts`** — A single product's own page: choose a quantity, add it to the cart.
- **`CartPage.ts`** — The shopping cart screen: is the right item there, at the right price and quantity, can it be removed, can the whole cart be emptied out.
- **`CheckoutPage.ts`** — The checkout review screen: is the address right, is the right item and total shown, add a delivery note, place the order.
- **`PaymentPage.ts`** — The card payment form: fill in card details and pay.
- **`OrderConfirmationPage.ts`** — The "thank you, your order is confirmed" screen after paying.
- **`FooterComponent.ts`** — Not a full screen — the newsletter sign-up box that sits in the footer of multiple pages. It gets its own file because it's reused in more than one place (home page and cart page), so it's written once and reused, not copy-pasted.

### `fixtures/` — the stage crew

Covered in depth above. Three files: `pageFixtures.ts`, `apiFixtures.ts`, `accountFixtures.ts`.

### `api/` — the direct phone line to the back office

These files skip the website's visual screens entirely and talk straight to the same data system the website itself runs on. This is used two ways: (1) as its own category of tests that check business rules directly (faster and more precise than clicking through a screen to check the same thing), and (2) as the plumbing behind the scenes for creating and deleting the throwaway test accounts fixtures use.

- **`BaseApiClient.ts`** — The shared toolbox for talking to the back office: send a request, read the reply. Every specific API file borrows from this instead of re-writing the same "how do I make a request" logic.
- **`ProductsApiClient.ts`** — Ask the back office for the full product list, or search for a product by name.
- **`AccountApiClient.ts`** — Create an account, log it in, look up its details, update it, delete it. This is the exact same create/delete logic the "stage crew" fixture (`accountFixtures.ts`) reuses to make and clean up throwaway test accounts.

### `data/` — the props and cast list

Three different ways of supplying values to tests, chosen deliberately per situation rather than by habit:

- **`accountProfiles.json`** — A fixed, structured description of a fake person (name, address, birthdate) used to create real throwaway test accounts. It's nested (a person has an address, which has its own fields, and a birthdate, which has its own fields) rather than one flat list — a closer match to how the real data is actually shaped.
- **`loginScenarios.json`** — A short list naming *which* wrong-login situations to test (wrong password, account that doesn't exist) without containing any actual email/password values — those get invented fresh at test time instead (see `utils/helpers.ts` below), so nothing that looks like a real password ever sits permanently in this file.
- **`scenarios.ts`** — The one live product (name, price, what to search for) that several cart/checkout tests depend on, named once instead of typed out separately in every test file. **Worth flagging: this is specific to the current target website's catalog — if this framework is pointed at a different site in the future, this file needs to be re-derived for that site's own catalog, not carried over as-is.**
- **`productQuantities.xlsx` / `productSearchTerms.xlsx`** — Plain Excel spreadsheets. These exist specifically so a non-technical teammate (a business analyst, for example) could open Excel and add or change a test case — a search term, a quantity to test — without touching any code.
- **`types.ts`** — Not data itself; it's a set of labels describing the *shape* each piece of data must take (a login scenario always has a case name and a source, an address always has these fields), so a typo or missing field gets caught immediately rather than causing a confusing failure later.

### `config/` — the sealed settings envelope

- **`env.ts`** — Reads the website's real address and the test account's login details from a private, un-shared settings file (`.env`, see below) and hands them to whichever test asks. If a required setting is missing, it refuses to run at all with a clear message, rather than limping along and failing confusingly later.
- **`globalSetup.ts`** — Runs once, automatically, right before any test starts. It double-checks that the one live product the tests depend on (`data/scenarios.ts`) still exists on the real website at the price the tests expect. If the website's own catalog has changed since the tests were written, this fails immediately with one clear message naming exactly what changed — instead of that same catalog change quietly causing ten unrelated tests to time out and confuse whoever's looking at the results.

### `tests/` — the actual scenes being tested, grouped by feature

Every file here contains the actual checks — "click this, then expect that." They're grouped by *feature*, not by type, so everything about carts lives together, everything about checkout lives together, and so on.

**`tests/ui/auth/`**
- **`login.spec.ts`** — Logging in with the correct details works; logging in with wrong details fails with the right message; a badly-formatted email gets blocked by the browser itself before it's even submitted.
- **`emptyFieldValidation.spec.ts`** — Submitting the login or signup form with a required box left empty gets blocked by the browser itself, before any request even goes out. Kept separate from `login.spec.ts` because "is this box empty" and "is this password wrong" are different questions, even though both involve a login-shaped form.

**`tests/ui/products/`**
- **`productsSearch.spec.ts`** — Searching for a handful of different terms (pulled from the Excel spreadsheet) each returns results; the first result from a search can be added to the cart.

**`tests/ui/cart/`**
- **`cart.spec.ts`** — Adding a product shows it in the cart at the right price; removing it makes it disappear.
- **`productQuantity.spec.ts`** — Setting different quantities on a product (2, 4, 7 — from the Excel spreadsheet) carries through correctly into the cart.

**`tests/ui/checkout/`**
- **`checkout.spec.ts`** — The full real journey: search, add to cart, review the order, leave a delivery note, pay with a card, see the confirmation. This is the one test that needs to already be logged in, which is why it's the one that uses the `accountFixtures.ts` stage crew instead of the plainer `pageFixtures.ts`.

**`tests/ui/`**
- **`newsletter.spec.ts`** — Subscribing to the newsletter works from both the home page and the cart page (the same footer box, tested in the two places it actually appears).

**`tests/api/`**
- **`products.spec.ts`** — The back office's product list and search both respond correctly, with no screen involved at all.
- **`auth.spec.ts`** — The back office's account rules, checked directly: correct login succeeds, wrong login fails, you can't register the same email twice, an account that never existed gives a clear "not found," a request missing a required piece of information is rejected with a clear message, and a full create → read → change → read again → delete cycle proves each step actually took effect on the real system rather than just trusting a success message.

**`tests/demo/` — temporary, not part of the permanent suite**
- **`intentionalApiFailure.spec.ts`** / **`intentionalUiFailure.spec.ts`** — Exist purely to prove the failure-reporting actually works end to end before a presentation: one deliberately-wrong check against the back office, one deliberately-wrong check against a real screen (which also proves the screenshot-on-failure feature works). Both are clearly marked "delete after the demo" in the file itself, and are tagged separately from the real tests so they're easy to find and remove afterward.

### `utils/` — small, reusable helpers that don't belong to one specific screen or feature

- **`helpers.ts`** — Invents realistic-looking, never-predictable emails and passwords on the spot. Used anywhere a test needs "some value" without that value being a real, guessable, permanently-committed credential.
- **`accountFactory.ts`** — Takes the structured fake-person data from `data/accountProfiles.json` and reshapes it into exactly the field names the back office's account API expects (which, confirmed by actually calling it, don't quite match the field names it accepts when *creating* an account versus what it hands back when *reading* one).
- **`excelData.ts`** — Opens an Excel file and turns each row into a plain, usable piece of test data — the mechanism behind the two `.xlsx` files described above.

### Reporting & reliability

- **`playwright.config.ts`** — The master settings file: which browsers to run in (Chrome, Firefox, Safari), how long to wait before giving up on something, how many times to retry a flaky-looking failure, which report formats to produce, and — new — that a screenshot gets attached automatically to every failed test's report entry.
- **`scripts/generate-allure-report.js`** — Builds the richer (Allure) report locally in a way that preserves its trend graph across multiple runs, instead of wiping that history out every time (which is what the plain command underneath it would otherwise do).
- **`.github/workflows/playwright.yml`** — The instructions for an automatic run of this entire suite whenever code is pushed or a change is proposed: install everything, run every test, save both report formats so anyone can download and view them afterward, and — if anything failed — post an alert to a Teams chat automatically.

### Config and settings files

- **`.env`** — The real, private settings: the actual website address and the actual test account's login details. Deliberately excluded from the shared project (see `.gitignore` below) so nobody accidentally publishes real login details.
- **`.env.example`** — A template showing *what* settings are needed, with none of the actual values filled in — so anyone setting this project up for the first time knows exactly what to create in their own private `.env`.
- **`.gitignore`** — The list of things that never get shared/saved into the project's history: the private `.env` file, generated reports, temporary browser session files, and other throwaway output.
- **`tsconfig.json`** — A technical settings file that, among other things, lets every other file refer to `pages/`, `fixtures/`, `data/`, etc. by short nicknames (like `@pages/LoginPage`) instead of long relative paths — purely a convenience for anyone reading or writing the code.
- **`package.json`** — The project's own index card: its name, the list of shortcut commands (`npm test`, `npm run test:smoke`, and so on), and every external tool it depends on.
- **`README.md`** — The technical companion to this document: setup steps, the full reasoning behind timing/wait decisions, and a running log of what's built versus what's deliberately left for later.

---

## Reliability — how flaky failures are avoided

A cheap, common way to write these kinds of tests is to add a fixed pause ("wait 5 seconds") before every action, hoping the page has caught up by then. This project deliberately does none of that. Instead, every click or check automatically waits for the specific thing it needs to be true (the button is actually there and visible) before acting, and gives up with a clear error if that never happens within a generous, evidence-based time limit. Three of those time limits were specifically loosened for this particular website, because it's a free public demo site that is sometimes genuinely slow to respond — that slowness was measured directly, not guessed at, and is explained in full in the README under "Timeouts & Wait Strategy."

## What to say if "fixtures vs. pages" comes up again

> "A page object is a cheat sheet for one screen. A fixture is the stage crew — it does the setup before a test starts and the cleanup after it ends, and it's what lets every test's own code contain only the actual check being made, not the housekeeping around it."
