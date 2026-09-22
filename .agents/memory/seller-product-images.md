---
name: Seller product image persistence
description: Why product records store image paths and real seller uploads remain gated by authentication and App Storage.
---

Seller product records store public sample paths or App Storage `/objects/...` paths, but never base64 image data or file bytes in PostgreSQL.

**Why:** The seller login remains intentionally demo-only, while App Storage write URLs require a separate authenticated browser session. This preserves the demo while preventing anonymous callers from minting upload URLs.

**How to apply:** Keep metadata CRUD usable with sample paths. For new files, require authenticated presigned uploads, finalize owner/public ACL metadata, and save only the returned object path.