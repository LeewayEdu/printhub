# Paid orders that Paystack does not recognise

Generated read-only on 2026-11-17 by `scripts/unverified-orders-report.mjs`. Nothing was changed.
Contains customer names (no emails, phone numbers or keys). Keep this repository private.

Paystack was asked about every order that is paid or later and carries a reference. 1 matched Paystack (success and the same amount);
**11** were not found by the live account, worth ₦271,280 in total.

| Order | Reference | Date | Amount | Status | Customer | Delivered | Points (log / transactions) | Commission paid |
|---|---|---|---|---|---|---|---|---|
| fd1841b5 | PRINTHUB-1780098791298 | 2026-05-29 | ₦15,000 | paid | Silas Umekwe | no | 0 / 0 | - |
| acfee1e5 | PRINTHUB-1780334760035 | 2026-06-01 | ₦15,000 | paid | Silas Umekwe | no | 0 / 0 | - |
| 9b0dd948 | PRINTHUB-1780352889934 | 2026-06-01 | ₦15,000 | delivered | Silas Umekwe | yes | 300 / 300 | - |
| 8fe7e447 | PRINTHUB-1780353292734 | 2026-06-01 | ₦30,000 | delivered | Silas Umekwe | yes | 600 / 600 | - |
| c9c235e6 | PRINTHUB-1780385216246 | 2026-06-02 | ₦30,000 | paid | Silas Umekwe | no | 0 / 0 | - |
| c5581fe1 | PRINTHUB-1781087200036 | 2026-06-10 | ₦120,000 | delivered | Silas Umekwe | yes | 2400 / 2400 | - |
| 42c362cd | PRINTHUB-1781090590785 | 2026-06-10 | ₦5,000 | delivered | Oche Samuel | yes | 100 / 100 | - |
| c06c0ed4 | PRINTHUB-1781598800511 | 2026-06-16 | ₦3,655 | delivered | Odoh Priscilla | yes | 73 / 73 | - |
| 8fa83ba8 | PRINTHUB-1781634200616 | 2026-06-16 | ₦11,825 | delivered | EYOJO BLESSING | yes | 237 / 236 | - |
| 3d6c4605 | PRINTHUB-1781652927630 | 2026-06-16 | ₦11,825 | delivered | Silas Umekwe | yes | 237 / 236 | - |
| 143b11b3 | PRINTHUB-1782212989801 | 2026-06-23 | ₦13,975 | delivered | Odoh Priscilla | yes | 280 / 279 | - |

## Commissions
- Commission ₦442.5 (10% of ₦4,425, pending) for affiliate BLESSING was awarded on order **abd8a141** (Favour Obazz, delivered). Paystack verification of that order: **success, same amount**. Order is not in the unrecognised list; referred customer matches order owner: yes.

Items per order are in `docs/unverified-orders.csv`.

Totals for these orders: delivered 8, loyalty points in log 4227 and in transactions 4224, commission ₦0.
