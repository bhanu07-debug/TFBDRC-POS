# Security Specification — Foody-Rest POS Backend (Phase 1)

## Data Invariants & Access Control Policy

1. **Authentication Model**:
   - Staff/Admin authenticate via Firebase Authentication (Email + Password).
   - Guests interact with tables via unique QR tokens (`tables/{tableId}`) without requiring full user account creation.
   - Public/Guest access is strictly limited to browsing menu catalog (`categories`, `menu_items`), reading table status (`tables`), reading basic restaurant settings (`settings`), and placing orders (`orders`).

2. **Sensitive Collections Protection**:
   - `payments`: Financial records are read-only / write-restricted to authenticated staff/admins.
   - `inventory`, `recipes`, `inventoryTransactions`: Stock control and raw material costs are strictly protected.
   - `auditLogs`: Immutable security logs accessible only to authenticated administrators.
   - `printJobs`: Protected hardware print queue.

3. **Validation & State Locking**:
   - `isValidTable()`: Enforces table number bounds (1..20), valid status enum ('AVAILABLE', 'OCCUPIED', 'BILLING'), string lengths.
   - `isValidOrder()`: Enforces item list size (<= 100), numeric subtotal/vat/total >= 0, status transitions.
   - `isValidKOT()`: Enforces station destination ('KITCHEN', 'RECEPTION'), valid item array.
   - `isValidPayment()`: Enforces numeric amount >= 0, payment method enum ('CASH', 'CARD', 'QR_WALLET'), status enum.
   - `isValidInventory()`: Enforces stock threshold bounds, string lengths.

---

## The "Dirty Dozen" Threat Payloads

| # | Attack Vector | Target Path | Threat Payload Description | Expected Result |
|---|---|---|---|---|
| 1 | PII & Financial Theft | `payments/PAY-001` | Unauthenticated guest attempts to read all payment records | `PERMISSION_DENIED` |
| 2 | Inventory Sabotage | `inventory/INV-001` | Unauthenticated user attempts to delete or overwrite inventory | `PERMISSION_DENIED` |
| 3 | Price Tampering | `menu_items/M-01` | Unauthenticated user attempts to update item price from 400 to 1 | `PERMISSION_DENIED` |
| 4 | Audit Log Erasure | `auditLogs/AUDIT-01` | Attacker attempts to delete or truncate audit log history | `PERMISSION_DENIED` |
| 5 | Negative Total Injection | `orders/ORD-01` | Order submitted with `total: -500` or invalid negative quantities | `PERMISSION_DENIED` |
| 6 | Ghost Field Spoofing | `tables/T01` | Attacker injects unauthorized fields like `isAdmin: true` into table doc | `PERMISSION_DENIED` |
| 7 | Unbounded String DOS | `orders/ORD-02` | Attacker submits 5MB junk string in `notes` or ID field | `PERMISSION_DENIED` |
| 8 | Setting Modification | `settings/restaurant_config` | Guest attempts to change VAT rate from 13% to 0% | `PERMISSION_DENIED` |
| 9 | Invalid KOT Destination | `kots/KOT-01` | Attacker sets invalid destination `destination: "HACKER_TERMINAL"` | `PERMISSION_DENIED` |
| 10| Out-of-Bounds Table | `tables/T999` | Attacker creates table with table number `9999` exceeding 20 tables | `PERMISSION_DENIED` |
| 11| Unauthenticated Recipe Read | `recipes/REC-01` | External guest attempts to scrape proprietary recipe formulation | `PERMISSION_DENIED` |
| 12| Print Job Hijack | `printJobs/PRN-01` | Unauthenticated user attempts to overwrite thermal printer queue | `PERMISSION_DENIED` |
