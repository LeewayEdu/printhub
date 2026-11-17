# Checkout flow review (read from the code, 17 Nov 2026)

| Topic | How it behaves today |
|---|---|
| Guest vs logged-in | The cart is open to everyone. `/checkout` needs a login: with no session it sends the visitor to `/auth?tab=login`, and an empty cart goes back to `/cart`. Order creation (`/api/orders/create`) also requires a valid login and takes the user from the session. Guest checkout does not exist; its plan is in `docs/guest-checkout-plan.md`. |
| Bank-transfer instructions | Choosing bank transfer shows the account details from `BANK_DETAILS` in `src/lib/constants.ts` and asks for a receipt. The order cannot be placed without a receipt file. |
| Receipt upload | The receipt is uploaded from the browser to the public `products` storage bucket under `receipts/`, and its public URL is stored on the order. Anyone who has that URL can open it. Moving receipts to a private bucket is a reasonable follow-up. |
| Order status after a bank order | Created `pending` with the message "Your payment receipt has been submitted. Our team will verify and confirm your order within 2 hours." Only an admin can mark it paid (now with a required note). |
| Payment under review | If Paystack reports a different amount or currency, the server holds the order as `payment_review`. The confirmation page says "Payment under review... our team is checking it" and promises contact, My Orders shows "Payment under review" (label added now), and the owner gets an alert email with expected vs paid amounts. |
| After paying by card | The cart is cleared and the customer lands on the confirmation page, which says "Verifying your payment…" and re-checks with the server until the order is paid. Then the page shows the order number, total and status, and, when the customer has their own file that has not been uploaded, the "Next step: upload your design file" step, plus Track Your Order and WhatsApp buttons. |
| Design file | Not needed to check out. Missing files make the order show "Awaiting design file" to the customer and admin, production cannot start, and reminder emails go out after 24 and 72 hours. |

Small fixes made in this pass: the checkout and the header cart badge no longer cause a browser hydration error when the cart is not empty (the server draws an empty cart, the browser draws the saved one).
