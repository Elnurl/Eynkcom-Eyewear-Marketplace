---
name: Wouter query routing
description: A subtle routing behavior affecting query-driven collection filters and searches
---

In this project's Wouter setup, the location hook returns only the pathname, not the query string. Read the query separately with Wouter's search hook when filters or search results depend on URL parameters.

**Why:** Parsing a query string from the pathname looked reasonable but silently lost category and search parameters; navigation appeared to work while the results ignored the requested filter.

**How to apply:** Whenever adding query-driven page state, subscribe to the search string directly and verify both fresh loads and in-app navigation. A pathname-only change listener will not react to edits of only the query string.