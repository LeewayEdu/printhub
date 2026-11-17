# Digital refund policy: DRAFT

Status: draft for review by the owner (and a lawyer if wanted). **Not live.** Nothing on the website uses this text, and the live Terms of Service have not been edited.

## Proposed wording (for the Terms or a Refunds page)

**Refunds for ebooks and other digital downloads**

1. **After you have downloaded an ebook, it cannot be refunded**, except when the file is defective (see item 3).
2. **Within 7 days of purchase, if you have not downloaded the file.** You can ask for a refund within 7 days of buying an ebook, as long as you have not downloaded it. We will refund the purchase and withdraw your access.
3. **A defective file.** If the file you downloaded is damaged, will not open, or is not the book you bought, tell us at [CONTACT EMAIL: TO BE ADDED] or on WhatsApp at [WHATSAPP NUMBER: TO BE ADDED]. We will first try to give you a working copy. If we cannot, we will refund the purchase. This applies even after a download.
4. When a refund is made, your access to that ebook is withdrawn and the download links stop working.
5. Printed books follow our normal returns rules: a free reprint if the error is ours.
6. Refunds go back to the original payment method where possible. Payment processor fees may not be recoverable. [CONFIRM WITH PAYSTACK how fees on refunds are treated before publishing this sentence.]

## How "downloaded" is decided
A download is counted by the system each time a download link is issued for an ebook (`entitlements.download_count` and the `download_log`). "Not downloaded" means the count is 0. This is recorded by the server, so it does not depend on what either side remembers.

## Placeholders to fill in before this goes live
- `[CONTACT EMAIL: TO BE ADDED]`
- `[WHATSAPP NUMBER: TO BE ADDED]`
- The Paystack fee sentence in item 6.

## Notes for the owner
- The 7 days are as you specified.
- How it works in the system: setting an order to "refunded" in the admin withdraws the ebook access and reverses the author's royalty entries (negative entries). The admin does not yet show the download count next to the order, so check `entitlements` or the download log before deciding on a refund request. Adding it to the order screen is a small follow-up.
- Consumer-protection rules may give some buyers extra rights depending on where they live (this matters once USD sales are switched on). Please have this checked before launch.
