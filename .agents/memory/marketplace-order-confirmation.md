---
name: Marketplace order confirmation
description: Seller confirmation requirement before fulfillment of real orders.
---

Every order must await confirmation from the selling optical shop after the buyer places it. For a multi-shop checkout, each shop must confirm its own portion. If one shop declines, the remaining portions must not proceed automatically: show the buyer the revised products, delivery fees, and total, and ask for explicit confirmation before proceeding. If the buyer does not confirm, cancel the remaining order.

**Why:** The owner requires a human availability check for each order rather than relying solely on stock numbers that can become stale. The owner also wants the buyer to approve the changed purchase if any shop cannot fulfill its portion.

**How to apply:** Show pending seller confirmation as distinct from confirmed fulfillment, and give each shop access only to confirm or decline its own portion. If a shop declines, pause the remaining portions until the buyer approves the recomputed order; otherwise cancel them. Do not promise dispatch while confirmation is pending. Card authorization/capture and refund timing still depend on a real payment provider and verified legal setup; do not pretend live payments are possible until those are settled.