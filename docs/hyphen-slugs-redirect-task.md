# Task: four product slugs that start with a hyphen (separate small deploy, not done)

Status: **not changed.** The owner decided on 2026-11-21 not to touch these tonight. This note is the plan for a separate, small deploy.

## The four products (all live; checked read-only on 2026-11-21)
| Id (first 8) | Current slug | Proposed slug | Order lines |
|---|---|---|---|
| 022e434b | `-backdrop-printing-event-stage-media-backdrop-banners` | `backdrop-printing-event-stage-media-backdrop-banners` | 0 |
| cce34dc9 | `-branded-shirts-custom-corporate-promotional-event-shirt-printing` | `branded-shirts-custom-corporate-promotional-event-shirt-printing` | 1 |
| 7481ebc7 | `-calendars-personalized-wall-desk-corporate-calendar-printing` | `calendars-personalized-wall-desk-corporate-calendar-printing` | 0 |
| a813fac5 | `-poster-printing-promotional-event-advertising-posters` | `poster-printing-promotional-event-advertising-posters` | 0 |

The new slugs collide with no existing product (checked). Orders point to the product by id, so existing orders are not affected.

## Why it matters
A slug starting with a hyphen works, but it looks like a typo in links and search results, and some tools treat a leading hyphen as an option. Each page is already
indexed under the old address, so the old address must keep working: a permanent redirect (308) to the new one.

## Steps (one deploy, in this order)
1. **Code first (this deploy):** add four permanent redirects in `next.config.js` `redirects()`: `/products/<old>` to `/products/<new>`, `permanent: true`.
2. **Then the database (one statement per product, owner's yes for each):**
   `update public.products set slug = '<new>' where id::text like '<id8>%' and slug = '<old>';`
3. **Check:** each old address answers 308 to the new one; each new address answers 200; the sitemap lists only the new addresses; canonical tags point to the new
   addresses; the shop and category pages link to the new addresses; product titles unchanged.
4. **Search engines:** after deploy, request re-indexing of the four new addresses; keep the redirects for at least a year.

## Rollback
Set the slug back with the same statement reversed and remove the four redirects. Orders are unaffected either way.

## Not part of this task
Prices, titles, H1s and descriptions stay as they are.
