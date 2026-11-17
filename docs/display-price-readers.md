# Who still reads or writes products.display_price

Search covered the whole repo (source, SQL files, root files, README) and the ERP working folder (no matches there).
There are no feeds, exports or scripts that use it; everything is in `src/`.

## Now using the shared "from" price (stored value ignored except for fixed-price products)
Shop page, home page, category pages, industry pages, product page (and its related products), the Product schema
and the chatbot all pass products through `withFromPrices()`.

## Still showing the STORED value (not the shared "from" price): needs a decision
| File | What it does |
|---|---|
| `src/app/starter-kits/page.tsx` (line ~115, 128) | Fetches its own product list in the browser and labels cards "From ₦{display_price}". |
| `src/app/election-campaign/page.tsx` (line ~85, 98) | Same. |
| `src/app/book-publishing/page.tsx` (line ~90, 99) | Same. |

These three pages can therefore show a different "from" price from the shop for the same product (as the shop did
before the fix). Fixing them means serving their product lists from the server with `withFromPrices()`.

## Admin: writes the stored value
`src/app/dashboard/admin/products/page.tsx` has a required "Display price" field, copies it into `price`, supports
bulk price edits and sorts by it (lines ~14, 332, 394-404, 563, 642-662, 856-913, 1109, 1588). Since "from" prices are
now computed, editing this field **no longer changes what customers see for calculator-priced products**; it only
matters for fixed-price products (3 today: Roll-Up Banner, Plastic Table Stands, Instagram Frame Board). Staff may
expect it to work. Suggested: relabel it "Fixed price (only used when 'fixed price' is ticked)" or hide it otherwise.

## Other readers (fine, they receive already-computed values)
`ShopComponents.tsx`, `ProductPageClient.tsx` (fallback before the calculator loads), `HomeClient.tsx`,
`lib/home-data.ts`, `lib/chat-context.ts`, `components/seo/index.tsx`.
