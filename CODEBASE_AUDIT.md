# Swastik codebase audit

Audit date: 2026-09-12  
Audited ref: `server-deploy` at `675dbaa68e43a4dbe15238b97e2f64107ebe3346`

## Scope and source-of-truth limitation

The client, server entrypoints, route modules, database adapter, contexts, utilities, and maintenance scripts were inventoried. The requested final schema comparison could not be completed because neither `database/schema.sql` nor `database/swastik_local.db` exists in this checkout or its Git history. The only available database is ignored `swastik_local.db` at the repository root. It contains 2,603 products, not the stated 3,731, so it was not treated as the production database.

The root database was inspected in immutable read-only mode. It has 16 application tables, five explicit indexes, no declared foreign keys, and passes `PRAGMA integrity_check`. Its SHA-256 hash was verified unchanged after the audit.

## Fixed in this audit

### Database lifecycle

- Removed automatic startup insertion of fallback products, partners, reviews, orders, roles, payment settings, MARG credentials, and partner profiles.
- Removed startup snapshot rehydration and customer/order rewrite calls.
- Removed hardcoded migration SQL that deleted test-looking orders, rewrote null order IDs, and inserted a specific order item.
- Corrected `MYSQL_SYNC_ENABLED`, which was previously always enabled because of `|| true`.
- Verified `db.init()` against a temporary database copy; its SQL dump was byte-for-byte equivalent before and after initialization.

### Fake and fallback behavior

- API-backed product, order, customer, staff, partner, and review state now begins empty instead of displaying demo business records.
- Removed the unused in-source demo customer, staff, order, partner, review, offer, and contact-message records.
- Empty API result sets are accepted as authoritative.
- Failed image uploads no longer return an Unsplash URL as a successful upload.
- Unsupported voice recognition no longer inserts a fabricated search phrase.
- WhatsApp delivery without a configured/working provider now fails instead of reporting a simulated dispatch.
- Manual customer campaigns now call the authenticated bulk-send API and display provider results; the fake success log and page-load birthday/anniversary dispatch simulation were removed.
- The OTP diagnostics screen now fails closed on network errors and no longer has a local verification-success path.
- Order mapping no longer invents a total of 350 or assigns the first rider when no rider is linked.

### Authentication and authorization

- Removed the universal OTP `8765` bypass and the customer-password `admin123` bypass.
- OTPs now use cryptographic randomness, expire after five minutes, allow at most five attempts, and are stored only after confirmed provider acceptance.
- Added server-issued, eight-hour, in-memory staff sessions with current database status and permissions checked on every protected request.
- Moved staff login verification to the server.
- Staff passwords are no longer returned by `/api/staff`, rendered in the dashboard, or cached in browser storage.
- New and changed staff passwords use Node's `scrypt`; legacy stored values remain login-compatible without rewriting the database.
- Protected staff, backup, MARG, WhatsApp, settings writes, uploads, product mutations, partner mutations, review moderation, order mutations, and payment-settings routes.
- Protected deletion-request review actions and manual notification creation from unauthenticated callers.
- Order deletion now waits for backend authorization and success before changing client state; inventory restoration failures prevent deletion instead of being suppressed.
- Password changes now verify the current password, enforce length limits, hash the replacement, revoke the session, and require a new login.
- Removed the false-success staff recovery update; self-service reset is disabled until a one-time server reset grant exists.
- Prevented staff managers from promoting, editing, or deleting administrator accounts outside their authorization level.

### Payments and uploads

- Removed fabricated Razorpay and Cashfree order/payment success responses.
- Razorpay verification now requires complete data and compares HMAC signatures in constant time.
- Razorpay webhooks now require a signature over the raw request body.
- Cashfree simulated webhooks are disabled; unverifiable payment checks fail closed.
- Public payment configuration no longer exposes gateway secrets.
- Checkout no longer opens a simulated-success flow when Razorpay fails; Cashfree checkout is disabled until a real client integration exists. COD is unchanged.
- Image uploads now require staff product permission, validate supported image MIME types, sanitize product-code filenames, and no longer derive public URLs from untrusted forwarded-host headers.

### Product/catalog integrity

- Product creation now validates names, prices, and stock values and preserves legitimate zero stock.
- Bulk imports no longer invent 100 units when stock is absent or invalid; missing inventory starts at zero.
- Corrected the product-insert retry contract from 16 placeholders for 17 columns and removed the fabricated fallback record ID `999`.

## Remaining critical/high-risk findings

These require another reviewable module because the missing final schema and current client contracts prevent a safe one-pass change.

1. **Customer authentication is not server-side.** Customer login/profile state is held in `localStorage`. `/api/customers`, `/api/orders`, and notification queries expose broad data, while profile updates lack customer-scoped authorization. Add expiring customer sessions after OTP verification, then replace list-and-filter client logic with `/me` and customer-scoped endpoints.
2. **Online checkout lacks a durable payment intent.** The provider order is created before the application order exists, so the server cannot validate the requested amount against a stored order. Introduce a pending payment/order transaction in the final schema, calculate totals from database product prices on the server, and only finalize after provider verification.
3. **Order creation trusts client-calculated business data.** `/api/orders` is public and accepts item prices, totals, discounts, points, customer identity, rider assignment, and stock changes from the request. It needs a customer or staff identity and server-side catalog price/stock calculation inside a transaction.
4. **Cashfree webhook verification is not implemented.** It is intentionally disabled rather than accepting unsigned client payloads.
5. **Backup restore is destructive and schema-incompatible.** `server/routes/backup.js` deletes populated tables and inserts legacy columns such as `mrp`, `weight`, and `description_en`. Keep restore unavailable operationally until it is transactional, schema-versioned, validated, and explicitly confirmed.
6. **Order creation and stock updates are not transactional.** Multi-step inserts, stock decrements, points changes, and notifications can partially succeed. The database adapter needs engine-specific transaction support.
7. **Database schema management is duplicated in application code.** `database/db.js` contains an ad-hoc schema and additive migrations instead of consuming versioned migrations derived from the missing final `database/schema.sql`.
8. **No relational constraints are declared in the available SQLite database.** `order_item.order_id`, product/customer/user references, and point-history references have neither foreign keys nor supporting indexes. Exact migration SQL must be based on the missing final schema and real database.
9. **Order list mapping has N+1 queries.** Each order separately loads items and may separately resolve customer and rider records. This will scale poorly as real order volume grows.
10. **Cross-database SQL translation is fragile.** Quoting and `?` replacement are string-based, PostgreSQL inserts do not return generated IDs, and failed primary reads may silently read stale SQLite data.
11. **Several broad catch blocks suppress database and persistence failures.** Route responses can report success after snapshot or related writes fail. Error responses also expose raw database error messages in multiple routes.
12. **CORS and rate limiting need production policy.** CORS reflects arbitrary origins and authentication/OTP/payment endpoints have no shared rate limiter.
13. **The client error logger accepts arbitrary bodies and appends synchronously to disk.** Add size/field controls, redaction, rotation, and request throttling or remove it.
14. **Several customer and notification endpoints are not identity-bound.** Phone numbers in requests are treated as identity, so customer profiles, order lists, and read-state changes cannot be securely scoped until customer sessions are implemented.

## Dead and obsolete code identified

- `server/utils.js` still contains now-unreferenced product/partner/review/order fallback constructors and file-based payment configuration.
- `database/db.js` still contains uncalled seed, snapshot-rehydration, and customer-rewrite functions. They are no longer invoked, but should be deleted after the final migration strategy is approved.
- Checkout and membership pages retain unreachable simulator UI/state that should be removed together with a real payment-intent integration.
- The disabled birthday/anniversary dashboard still contains unreachable presentation code; it no longer generates or reports fake sends.
- `fetchCustomers_DELETEIT` was a duplicate customer loader and was removed.
- `package.json` has no actual lint or automated test command; the current lint script only echoes a message.

## Validation performed

- All server, route, database, and script JavaScript files passed `node --check`.
- `npm run build` succeeded. Vite still reports the existing large-chunk and mixed Capacitor import warnings.
- `npm run lint` ran, but the repository defines it as `echo 'No lint check needed'`.
- Password hashing, correct-password verification, wrong-password rejection, and legacy-password compatibility passed targeted checks.
- An isolated HTTP smoke test on a temporary database copy verified public products/config access, protected staff/payment-settings/backup access, invalid-login rejection, and absence of payment secrets from public config.
- An authenticated temporary-database smoke test verified hashed staff login, authorized product creation, and preservation of a legitimate zero stock value.
- The available root database hash remained unchanged.

## Required inputs for final-schema work

Provide the actual `database/schema.sql` and the 3,731-product `database/swastik_local.db`. Do not substitute the current root database. Once present, compare `sqlite_master`, `PRAGMA table_xinfo`, indexes, foreign keys, triggers, views, row counts, nullability, duplicates, and orphan records before producing a non-destructive migration.
