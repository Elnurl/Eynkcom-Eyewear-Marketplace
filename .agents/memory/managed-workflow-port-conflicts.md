---
name: Managed workflow port conflicts
description: What to check when an artifact workflow fails with EADDRINUSE despite the preview still responding
---

An artifact workflow can report FAILED with EADDRINUSE while an older instance of the same service remains alive and serves requests.

**Why:** A restart once left the previous web and API processes listening on their managed ports, so the replacement processes failed even though the preview and API still answered.

**How to apply:** Before changing the app or workflow configuration, inspect the listening ports and process tree. If the port holder is an orphaned instance of that same managed service, stop only those stale processes and restart the existing artifact workflow. Do not configure a duplicate workflow.