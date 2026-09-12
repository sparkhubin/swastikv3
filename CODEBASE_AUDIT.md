# Swastik final-schema compatibility audit

Audit date: 2026-09-12  
Source of truth: `database/schema.sql` and `swastik_local_final.db`

## Database verification

- The normalized schema declared by `database/schema.sql` matches the schema in `swastik_local_final.db`.
- SQLite integrity and foreign-key checks pass.
- The committed database contains 3,731 products and 3,731 inventory rows. No product or inventory row was created, changed, or deleted by this work.
- The committed database contains no customer, order, customer-points, or customer-membership rows. None were recreated.
- Runtime database initialization now validates the final schema; it does not migrate, seed, restore snapshots, or fall back to another store.
- The five existing staff credentials were converted in place from plaintext to salted scrypt hashes; plaintext password authentication is rejected. Product and inventory rows remained byte-for-byte equivalent at the SQL row level.

## Compatibility and security changes

- Server queries use only final-schema tables and columns. Product stock is read from `inventory`; points and memberships use their ledger/history tables.
- Staff and customer authentication use expiring, hashed, database-backed sessions. Staff authorization is derived from roles and permissions on every request.
- Customer resources, orders, notifications, points, and memberships are identity-scoped.
- Order totals and stock reservations are calculated and updated transactionally by the server. Cancellation and failed-payment paths release reservations and restore redeemed points idempotently.
- Payment settings, provider requests, verification, signed webhooks, transaction history, and membership payment activation use final-schema payment tables.
- WhatsApp settings, templates, actual provider attempts, automatic events, and logs use the final WhatsApp tables. Failed or unconfigured sends are never reported as successful.
- Delivery assignment and rider scope use `delivery_staff` and `delivery_assignment`.
- MARG settings are database-backed; authenticated bill ingestion records idempotent point history for matched customers.
- Destructive legacy backup/restore, seed, import, snapshot, fake payment, fake stock, and simulated messaging paths were removed or explicitly disabled when the final schema has no safe representation.

## Automated verification

`scripts/integration.test.js` runs against a temporary copy of the final database. It covers staff, rider, and customer authentication; role enforcement; customer isolation; product/inventory behavior; server-calculated order totals; stock reservation and fulfillment; delivery scope; point history; membership history; notification isolation; rejected forged payments; and failed WhatsApp provider attempts.

Production payment, WhatsApp, MARG, CORS, and public URL values must be configured by an administrator before external provider flows can be exercised.
