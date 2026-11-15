# Option data bug: "900gsm" on business cards

Status: **investigation and proposal only. Nothing was written.**

## The defect

`spec_options` row `9727db81-37b8-4c33-b938-64c7c0e70b65` (category `complimentary-cards`, group `paper_weight`,
label `900gsm`) has `modifier_type = 'base_rate'` and `price_modifier = 50`. Its siblings are percentages
(`300gsm (Standard)` = 0%, `600gsm Thick` = +30%). The price calculator takes the **first** base-rate option it
finds, so choosing 900gsm makes it use 50 as the base rate instead of the paper type's base rate (₦10,000 for Paper
Card). A customer who picks 900gsm sees a total of about **₦54 for 100 business cards**.

Scale: business cards have 240 selectable combinations of options; **80 of them (every combination containing
900gsm) price wrongly.** The shared "from" price already ignores these combinations, so it is not affected.

## Same problem elsewhere?

I checked every category used by an active product (26) by pricing every combination of options and flagging
any combination with two base-rate options or a total of zero. **No other live category is affected.**

Not live, so no customer impact today, but they show the same pattern if those categories are ever used again:
legacy category labels ("Sheet Printing", "Stickers & Labels", "Photo & Frame Printing", "Packaging",
"signage_installation") and the duplicate "NCR / Carbonless Forms" have base-rate options in more than one group or
a base-rate of 0 mixed with other types. Also `Paper Sticker` (base_rate 5) in `vinyl-stickers-labels` and
`Stone Texture Lamination` = 120% in "Sheet Printing" look odd but are in categories with no active product.

## Proposed fix (needs one number from you)

**Intended uplift of 900gsm over 300gsm: ____ %** (left blank in your message, so I have not guessed it; for
reference 600gsm is +30%).

```sql
-- affects exactly 1 row (900gsm, business cards). Replace <PCT> with your number.
update public.spec_options
   set modifier_type = 'percentage',
       price_modifier = <PCT>
 where id = '9727db81-37b8-4c33-b938-64c7c0e70b65'
   and category = 'complimentary-cards' and spec_group = 'paper_weight';
```

Until you have the number, the safe stop-gap is to hide the option (1 row):

```sql
update public.spec_options set is_active = false
 where id = '9727db81-37b8-4c33-b938-64c7c0e70b65';
```

I will not run either without your approval.
