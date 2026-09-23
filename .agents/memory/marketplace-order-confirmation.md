---
name: Marketplace order confirmation
description: Seller confirmation requirement before fulfillment of real orders.
---

Every order must await confirmation from the selling optical shop after the buyer places it. For a multi-shop checkout, each shop must confirm its own portion. The result when one shop declines has not yet been chosen.

**Why:** The owner requires a human availability check for each order rather than relying solely on stock numbers that can become stale.

**How to apply:** Show pending seller confirmation as distinct from confirmed fulfillment, and give each shop access only to confirm or decline its own portion. Do not promise dispatch while confirmation is pending. Card authorization/capture and refund timing still depend on a real payment provider and verified legal setup; do not pretend live payments are possible until those are settled.