---
name: API test module resolution
description: Why isolated API test bundles need workspace-aware dependency resolution
---

When running an isolated server test bundle outside a workspace library's source tree, do not assume its dependencies can resolve from the API artifact.

**Why:** The pnpm workspace makes dependencies available to the package that declares them. Bundling a library's source into a server-side test and externalizing its imports can leave those imports resolving from the test output's directory instead, where they are not installed.

**How to apply:** For isolated tests that bundle workspace library source, resolve library-only dependencies from that library's own package context, or bundle them with the source. Keep production package ownership intact rather than adding runtime dependencies to the API artifact just to satisfy tests.