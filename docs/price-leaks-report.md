# Price leaks: read-only report on past orders

Method: every order line in the database (39 lines) was checked. Nothing was changed.

## The three fixed-price products
Only **one** order has ever contained any of them:

| Order | Date | Status | Product | Paid | Stored fixed price | Verdict |
|---|---|---|---|---|---|---|
| `c5581fe1` | 10 Jun 2026 | delivered | Roll-Up Banner Printing | ₦120,000 | ₦60,000 each | Consistent with 2 units at ₦60,000. The old line recorded no options or quantity, so the quantity cannot be proven. No evidence of under- or over-charging. |

- **Instagram Frame Board:** no order lines. Nobody has bought it, so the ₦4 page price never cost you anything.
- **Plastic Table Stands:** no order lines.

## Business cards using 900gsm
**None.** No order line has ever used the 900gsm option, so the ₦54 price never reached a real order.

## Conclusion
No past order was affected by the calculator bug on fixed-price products or by the 900gsm option. The exposure
was real (anyone could have bought a ₦15,000 frame board for ₦4) but it was not exploited in the order history.

## What was fixed
- Fixed-price products now price as stored price x quantity on the page, cart, checkout, pro-forma, schema and chatbot.
- Every new order is re-priced on the server from the database and refused if any line differs by more than ₦1
  (`src/lib/order-pricing.ts`, tested in `scripts/check-order-pricing.mts` and `tests/price-roundtrip.test.mjs`).

## Assumptions (please confirm)
- A fixed price is **per piece** and final. This matches Instagram Frame Board (min 1) and Roll-Up Banner (min 1).
  For **Plastic Table Stands (minimum 10, stored ₦4,000)** this means ₦40,000 for the minimum order of 10. The
  question "per piece or for the minimum of 10" was left blank in the request. If ₦4,000 is the price for the
  10-pack, the change is one line (`fixedPriceTotal` in `src/lib/priceCalc.ts`).
- Fixed prices are shown and invoiced as VAT-inclusive, like calculator prices (no VAT status is stored for them).
