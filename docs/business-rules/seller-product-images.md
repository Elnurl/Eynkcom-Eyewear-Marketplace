---
name: Seller product image ownership
description: Why product image writes must be tied to the approved shop and verified before database references or deletion.
---

Seller product records store sample paths or App Storage object paths, never base64 bytes. Signed uploads need an ownership record tied to the approved shop and account before completion or product assignment.

**Why:** A signed URL by itself does not prove who requested it; authenticating only the completion request lets another signed-in account claim an object path. Metadata changes and storage deletion must not operate on another shop's object.

**How to apply:** Keep sample path CRUD working. For new files, check the approved shop, issued upload ownership, finalized ACL, and live product references before replacing or deleting an object.