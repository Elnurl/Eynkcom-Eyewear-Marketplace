---
name: Marketplace admin access
description: Who can administer the marketplace in its first real-sales release.
---

For the MVP, only the owner may access the EYNƏK.com admin panel. Staff accounts and delegated admin roles are deferred.

**Why:** The owner explicitly chose sole administrator access for launch, with staff roles added later.

**How to apply:** Protect admin APIs and pages with server-verified, explicitly granted admin identity, separate from shop-scoped seller access. Never grant admin privileges merely because someone registered first or claimed to be the owner. Keep future role expansion possible without granting it at launch.