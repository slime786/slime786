# Slime's Collectables — Data Retention & Deletion

Working privacy/data-handling policy for launch. The principle is to keep personal data only for as long as there is a genuine operational, accounting, tax, fraud, dispute or legal reason.

## Data categories

### Temporary stock reservations
- Keep only as long as needed to prevent overselling and diagnose checkout problems.
- Expired reservations should be released automatically.
- Old operational reservation data should be periodically purged or anonymised when it is no longer useful.

### Cancelled / failed checkout attempts
- Keep only the minimum data needed for payment reconciliation, abuse/fraud investigation or support.
- Do not retain unnecessary customer details from abandoned attempts.

### Paid orders
- Keep the order number, items, totals, payment status, fulfilment details and the minimum customer information needed for accounting, tax, disputes, fraud prevention and legal obligations.
- The exact accounting/tax retention period must be confirmed against the seller's final business/tax status before launch.
- When the applicable retention need ends, delete or anonymise personal fields that no longer need to identify the customer.

### Customer-service messages
Working default: delete routine enquiries around 12 months after the matter is resolved unless they are linked to an order, dispute, fraud concern or another reason that requires longer retention.

### Technical logs
Keep only what is useful for security and troubleshooting. Avoid placing full addresses, payment credentials or other unnecessary personal data in logs.

## Review process

At least periodically:
1. identify old records that no longer have an active purpose;
2. preserve anything subject to an active dispute, chargeback, fraud review or legal/accounting hold;
3. delete or anonymise personal data that no longer needs to identify the customer;
4. verify backups/exports do not become an indefinite shadow copy without a retention reason.

## Customer requests

Use the shop Contact route for privacy/data requests. Before releasing or changing order-linked information, verify the requester sufficiently to avoid disclosing another person's data.

## Never store in the storefront repository

- PayPal Client Secret;
- Supabase service-role key;
- full card/bank details;
- customer order exports;
- customer addresses/emails;
- production database backups containing customer data.

## Final launch confirmation still required

Before real payments, confirm the seller's business/tax status and then set the exact statutory/accounting retention period for paid-order records. Until then, the rule is: retain only what is necessary, justify it, and review it.

_Last reviewed: 25 September 2026._
