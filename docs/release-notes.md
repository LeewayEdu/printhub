# Release notes: November 2026

What changed on PrintHub, in plain language. Nothing is live until you deploy it. Some items need a database step first; see
`docs/release-runbook.md`.

## Payments and security
- **Orders are now created and confirmed by the server.** The browser can no longer mark an order as paid. An order becomes paid only
  after the server asks Paystack and the amount and currency match. The verified amount and Paystack status are stored.
- **Prices are checked on the server.** Every cart line, the delivery fee, the promo discount and the total are recalculated from the
  database. A cart that differs by more than ₦1 is refused.
- **Delivery option is required** on every order with a physical item (printed product or print book). Free pickup counts as a choice.
  The delivery fee comes from the delivery table, and pickup or home delivery is taken from the option the server priced.
- **Manual "paid" needs a reason**, a confirmation and leaves an audit record. Test orders are labelled and left out of revenue.
- **Daily payment check** compares Paystack payments with orders and emails an alert when something does not match.
- **Leads form is protected** (hidden-field trap, rate limit, phone and email checks) and admins read leads through a server route.
- **Affiliate commission** is earned once per order, when it is delivered.
- Security headers (the content policy is report-only), `security.txt`.
- Needs the database steps in the runbook: the unique indexes, the leads and order-table protections (the last one only after a real order).

## Pricing
- One shared price function now drives product cards, product pages, structured data and the chatbot, so they agree.
- Fixed-price products and "from" prices fixed; minimum order amounts for banner, backdrop and window products.
- A business-card option (900gsm) is hidden pending the right percentage.

## Checkout and cart
- Product page: Add to cart is always available with a live design choice, one main total, a quantity tier table, a sticky buy bar on
  phones, collapsible option groups and a trust row.
- **Design file after payment:** you can check out without a file, upload it afterwards, and production is blocked until it arrives.
  Reminders go out after 24 and 72 hours.
- Phone number required before payment; real delivery range shown in the cart; cart shows product photos and a friendly design notice.
- Pro-forma invoice from the cart and checkout, with the single company address.
- Shop and home pages tidied: clearer buttons, sticky filters, mobile search, one floating launcher for the assistant and WhatsApp.

## Books (C-Chu Books)
- **Hidden at launch.** The Books menu link is off by default (`BOOKS_NAV_ENABLED`), and USD prices are off (`BOOKS_USD_ENABLED`). The
  pages exist by address and say "coming soon" until a book is published.
- Storefront with book pages, author pages and book structured data. Ebooks are delivered with signed, time-limited links and a buyer
  stamp on every page; the stamp is made in the background after payment, so a download never waits.
- Admin tools for authors, books, formats, private file uploads, rights confirmation (a book cannot publish without it) and publishing.
- Royalty ledger with rules in the database (distribution 70/30, package 80/40, 85% on the author's own referral for ebooks, 30-day hold,
  ₦5,000 minimum), bundle splitting, refunds that reverse entries, naira payouts and a CSV export. A print sale with no print cost is
  flagged instead of guessed.
- Admin order screen now shows each ebook's download count and last download time, for refund decisions.
- Ebook size limit is a setting (30 MB by default).
- Refund policy for digital books is a **draft**, not live. Terms were not changed.

## Case studies
- A new Case studies section with two jobs prepared. **Both are unpublished** because client consent is outstanding, and neither is in
  the sitemap or any link.
- While consent is not given, the client, party, book titles and place names are hidden and replaced with neutral wording
  ("a state rally", "another state"). Preview with a private token is available to you only.
- Pages have an accessible photo gallery, structured data without ratings, and a WhatsApp button that records a lead with source `case_study`.

## SEO and accessibility
- Sitemap generated from the database; fixed titles, descriptions and canonical links; structured data for the business, FAQs, products
  and breadcrumbs.
- Star ratings and rating data appear only when there are approved reviews.
- Claims that could not be backed up were replaced with figures from real data; wording about rush jobs and reprints matches the Terms.
- Accessibility fixes, faster images (modern formats, lazy loading), paginated shop, favicon, manifest, a slim tracking-consent bar.
