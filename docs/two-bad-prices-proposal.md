# Two bad prices: Instagram Frame Board and Plastic Table Stands

Status: **investigation and proposal only. Nothing was written.**

## What is actually wrong

Both products are flagged `is_fixed_price = true` with a stored price, so the **shop cards and "from" prices
are correct today**: Instagram Frame Board **₦15,000**, Plastic Table Stands **₦4,000**.

The bad numbers come from the **product page**. Its calculator prices every product from the options of its
category, ignoring the fixed-price flag. These two products sit in sticker categories (`stickers_labels`,
`vinyl-stickers-labels`), so the calculator prices them as stickers of about one square inch:

| Product | Stored fixed price | Product page shows | Min qty |
|---|---|---|---|
| Instagram Frame Board | ₦15,000 | ₦4 | 1 |
| Plastic Table Stands | ₦4,000 | about ₦161 (₦54 at the minimum) | 10 |
| Roll-Up Banner Printing (same flaw) | ₦60,000 | ₦59,663 | 1 |

A customer could add a ₦15,000 frame board to the cart for ₦4. (My earlier ₦4 and ₦54 figures came from
this calculator; the card prices were never wrong.)

## Proposal

### 1. Pricing (recommended: a small code fix, no data needed)

Make the product page honour `is_fixed_price`: the price is the stored price, not the calculator's. For
Instagram Frame Board that is simply ₦15,000 per piece. **Open question for Plastic Table Stands (left blank
in your message):** is ₦4,000 the price **per piece** or **for the minimum order of 10**? The page needs one
or the other (₦40,000 vs ₦4,000 for 10).

If you prefer data only (what you asked for), the alternative is a minimum order value:

```sql
-- 2 rows. The calculator then never returns less than this amount for the product.
update public.products set min_order_amount = 15000
 where id = 'bf815ecf-e47a-409f-b5c3-fb8a3b5a4a30';            -- Instagram Frame Board
update public.products set min_order_amount = <TABLE STAND MINIMUM>
 where id = 'cfb7cf7d-8a4e-4167-a101-725d662479b4';            -- Plastic Table Stands
```

Limitation: a minimum is only a floor. Two frame boards would still cost ₦15,000 in total, not ₦30,000,
because the sticker maths stays underneath. That is why the code fix is the right one.

### 2. Moving the products out of the sticker categories

Their *customer-facing* tags are already right (Event Materials, Campaign Materials, Custom Packaging,
Signage & Installation, Wedding Essentials). What is wrong is the pricing category: both products appear on
the `/categories/vinyl-stickers-labels` and `/categories/stickers_labels` pages and use sticker options.

None of the 28 active pricing categories fits (they are paper, cards, apparel, banners, books, stickers and
similar). A new fixed-price category is needed. The name is yours to choose; I suggest "Event & Display Items":

```sql
-- 1 row inserted, 2 rows updated. Names and sort order are suggestions.
insert into public.categories (slug, label, price_model, sort_order, is_active)
values ('event-display', 'Event & Display Items', 'fixed', 40, true);

update public.products
   set product_type = 'event-display', category = 'Event & Display Items'
 where id in ('bf815ecf-e47a-409f-b5c3-fb8a3b5a4a30', 'cfb7cf7d-8a4e-4167-a101-725d662479b4');
```

Effect: `stickers_labels` is left with no active product (its page and sitemap entry drop out automatically);
`vinyl-stickers-labels` keeps 2 products (Campaign Stickers, Product Packaging Stickers). Products keep their
stored price and fixed flag. No spec options are needed for a fixed-price category.

## Other products with a "from" price under ₦500

After excluding fixed-price products (which use their stored price) there are **4**, all area-priced:

| Product | Site "from" price | Why |
|---|---|---|
| Banner Printing | ₦430 | ₦400 per sq ft + 7.5% VAT, for 1 sq ft |
| Campaign Banner | ₦430 | same |
| Backdrop Printing | ₦430 | same |
| Window Graphics | ₦430 | same (page default ₦538) |

These are real starting rates but not realistic job prices (nobody orders 1 sq ft of backdrop). Two
fixes are possible: show the price as "from ₦430 per sq ft", or set a product minimum size or minimum order
value so the "from" price reflects a minimum real job.
