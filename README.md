# printhub
PrintHub - C-Chu Media Print Platform

## Notes for maintainers

- **Lead form protection and its rate-limit caveat:** see [docs/leads-endpoint-protection.md](docs/leads-endpoint-protection.md).
  The in-app limit is per server instance, so a Vercel Firewall rule on `/api/leads` is recommended.
- **Chatbot prices come from live data.** `node --test tests/chat-prompt.test.mjs` fails if a ₦ amount is typed
  into the chatbot prompt files.
- **Prices:** "From" prices are computed by `src/lib/pricing-server.ts` using the same calculation as the product
  page (`src/lib/priceCalc.ts`). The stored `products.display_price` is only used for fixed-price products.
- Investigation notes (referrals, loyalty points, option data, guest checkout) are in `docs/`.
