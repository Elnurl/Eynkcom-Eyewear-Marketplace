---
name: Marketplace order confirmation
description: Seller confirmation requirement before fulfillment of real orders.
---

Every order must await confirmation from the selling optical shop after the buyer places it. For a multi-shop checkout, each shop must confirm its own portion. If one shop declines, the remaining portions must not proceed automatically: show the buyer the revised products, delivery fees, and total, and ask for explicit confirmation before proceeding. If the buyer does not confirm, cancel the remaining order.

The seller confirmation deadline is intentionally undecided until partner shops are consulted.

For online card orders, the owner chose to place a card authorization hold when the buyer submits the order, then capture funds only after seller confirmation and any required buyer reconfirmation. The owner expects a fresh stock check on each order attempt; this does not replace the selling shop's confirmation.

**Why:** The owner requires a human availability check for each order rather than relying solely on stock numbers that can become stale. The owner also wants the buyer to approve the changed purchase if any shop cannot fulfill its portion. A card hold at submission avoids collecting captured funds for an unconfirmed order, while fresh stock checks reduce avoidable rejections.

**How to apply:** Show pending seller confirmation as distinct from confirmed fulfillment, and give each shop access only to confirm or decline its own portion. Check and reserve available stock atomically on the server at order submission so concurrent website orders cannot oversell; release reservations when authorization fails or the order is cancelled. A database check cannot account for unreported physical-shop sales, so keep the seller confirmation step. Authorize the full card amount at submission, but capture only after all relevant confirmations. If a shop declines, pause the remaining portions until the buyer approves the revised total; release the hold if the purchase is cancelled. Confirm hold expiry and reduced-amount capture with the chosen provider; if reduced capture is unavailable, obtain fresh authorization for the revised amount rather than charging an unapproved total. Do not promise dispatch or a specific response deadline while confirmation is pending, and do not hard-code an automatic cancellation timer before shops agree to one. Live card processing still depends on provider and legal approval.