---
name: Seller product image persistence
description: Why product records store image paths and real seller uploads remain gated by authentication and App Storage.
---

Seller product records may store public image paths or URLs, but must never store base64 image data or file bytes in PostgreSQL.

**Why:** Persistent seller uploads need protected ownership and durable file storage. The current seller login is intentionally demo-only, so exposing an unauthenticated upload route would let anyone write files.

**How to apply:** Keep metadata CRUD usable with existing public sample paths. Enable new file uploads only together with real seller authentication and App Storage, then save returned object paths in product records.