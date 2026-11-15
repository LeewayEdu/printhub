# Card price vs product page price, before the shared pricing function

Generated from the live catalogue (34 active products). "Card" is the stored display_price that shop cards showed. "Page default" is what the product page shows first (default options, minimum quantity). "New from" is the lowest valid configuration at minimum quantity, now used everywhere.

| Product | Price model | Min qty | Card (old) | Page default | New "from" | Card = page? |
|---|---|---|---|---|---|---|
| Business Card Printing – Custom Corporate | per_100 | 100 | ₦15,000 | ₦13,975 | ₦10,750 | NO |
| Branded Shirts – Custom Corporate, Promot | per_piece | 1 | ₦7,500 | ₦5,698 | ₦3,483 | NO |
| Campaign Stickers – Custom Political & Ele | area_sqin | 100 | ₦4,000 | ₦1,613 | ₦538 | NO |
| Backdrop Printing – Event, Stage & Media | area | 1 | ₦400 | ₦430 | ₦430 | NO |
| Magazine Printing – Custom Magazine & Peri | per_page | 50 | ₦4,000 | ₦66,650 | ₦66,650 | NO |
| Campaign Caps – Custom Political & Promoti | per_piece | 10 | ₦28,000 | ₦34,400 | ₦31,659 | NO |
| Customized Receipt Booklets – Branded Rece | per_piece | 1 | ₦10,000 | ₦2,149 | ₦2,149 | NO |
| Roll-Up Banner Printing – Portable Pull-Up | area | 1 | ₦60,000 | ₦59,663 | ₦60,000 (fixed price, stored) | NO |
| Branded Face Caps – Custom Logo Cap Printi | per_piece | 10 | ₦30,000 | ₦34,400 | ₦31,659 | NO |
| Customized Shawarma Wrapping Paper – Brand | per_100 | 100 | ₦20,000 | ₦30,638 | ₦30,638 | NO |
| Birthday Invitation Cards – Mini Party Inv | per_100 | 100 | ₦5,000 | ₦13,975 | ₦10,750 | NO |
| Customized Sashes – Branded Event, Award & | per_piece | 5 | ₦20,000 | ₦21,500 | ₦18,813 | NO |
| Campaign Banner – Custom Banner print | area | 1 | ₦400 | ₦430 | ₦430 | NO |
| Custom Paper Bags – Branded Shopping, Gift | per_100 | 100 | ₦43,000 | ₦36,980 | ₦35,905 | NO |
| Window Graphics – Branded Window Sticker & | area | 1 | ₦2,400 | ₦538 | ₦430 | NO |
| Throw Pillows – Personalized Decorative Cu | per_piece | 1 | ₦17,000 | ₦13,438 | ₦13,438 | NO |
| Banner Printing – Indoor & Outdoor Promoti | area | 1 | ₦400 | ₦430 | ₦430 | NO |
| Custom Brochure Printing – Bi-Fold, Tri-Fo | per_page | 1 | ₦8,000 | ₦1,334 | ₦934 | NO |
| Plastic Table Stands – Custom Tabletop Dis | area_sqin | 10 | ₦4,000 | ₦161 | ₦4,000 (fixed price, stored) | NO |
| ID Cards – Staff, Student & Corporate Iden | per_piece | 1 | ₦3,000 | ₦4,085 | ₦2,365 | NO |
| Branded Pens – Custom Logo Pen Printing & | per_piece | 10 | ₦10,000 | ₦11,825 | ₦11,825 | NO |
| Campaign Shirts – Political, Election & Pr | per_piece | 1 | ₦15,000 | ₦5,698 | ₦3,483 | NO |
| Poster Printing – Promotional, Event & Ad | per_100 | 100 | ₦30,000 | ₦29,563 | ₦8,600 | NO |
| Calendars – Personalized Wall, Desk & Cor | per_piece | 50 | ₦50,000 | ₦319,813 | ₦49,719 | NO |
| Instagram Frame Board – Custom Social Medi | area_sqin | 1 | ₦15,000 | ₦4 | ₦15,000 (fixed price, stored) | NO |
| Letterhead Printing – Custom Business & Co | per_piece | 50 | ₦8,000 | ₦19,350 | ₦16,125 | NO |
| Branded Envelopes – Custom Business & Corp | per_100 | 50 | ₦10,000 | ₦13,438 | ₦12,094 | NO |
| Customized Jotters – Branded Writing Pads | per_page | 50 | ₦35,000 | ₦62,081 | ₦45,956 | NO |
| Product Packaging Stickers – Custom Labels | area_sqin | 100 | ₦5,000 | ₦1,613 | ₦538 | NO |
| Certificate Printing – Custom Award, Recog | per_piece | 10 | ₦8,000 | ₦5,375 | ₦3,225 | NO |
| Customized Nylon Bags – Branded Shopping & | per_100 | 100 | ₦11,000 | ₦23,113 | ₦3,225 | NO |
| Customized Mugs – Magic Mugs & Branded Cer | per_piece | 1 | ₦4,000 | ₦3,763 | ₦3,763 | NO |
| Promotional Flyer Printing – Business, Eve | per_100 | 100 | ₦10,000 | ₦29,563 | ₦8,600 | NO |
| Branded Vehicle Graphics – Custom Vehicle | fixed | 1 | ₦300,000 | ₦161,250 | ₦161,250 | NO |

Products where card and page default disagreed: 34 of 34.

Correction: three products are flagged fixed-price (Roll-Up Banner, Plastic Table Stands, Instagram Frame Board). The site uses their stored price as the "from" price, so the rows above show that; the calculator is only wrong on their product pages (see docs/two-bad-prices-proposal.md).

Data issues found while doing this (not changed):
- Business cards: the "900gsm" paper-weight option is stored as modifier_type base_rate (50) instead of percentage, so choosing it prices 100 cards at about ₦54. It is excluded from "from" prices.
- Instagram Frame Board (page shows ₦4) and Plastic Table Stands (page shows ₦161 or ₦54): fixed-price products whose product pages price them with sticker options. Cards and "from" prices are correct (₦15,000 and ₦4,000).
