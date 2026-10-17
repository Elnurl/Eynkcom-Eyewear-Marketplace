# Horizon Optic — Excel import

Import **30** products from `EYNEK_ilk_mehsullar_siyahisi (1).xlsx` into **Horizon Optic** (`eeenu7@gmail.com`).

```bash
python scripts/import_horizon_from_excel.py --dry-run
python scripts/import_horizon_from_excel.py
python scripts/import_horizon_from_excel.py --xlsx "C:\path\file.xlsx"
```

| Flag | Purpose |
|------|---------|
| `--dry-run` | Fetch prices/sources only; no downloads or DB |
| `--ensure-store` | Create `Horizon Optic` on **local** DB if missing (do not use on production) |

**Requirements:** `openpyxl`, `requests`, `psycopg2-binary`, `DATABASE_URL` in repo root `.env` (UTF-8 with BOM is OK).

**Production (eynek.store):** Point `.env` `DATABASE_URL` at Render Postgres (External URL), run **without** `--ensure-store`. Store must already exist. Re-run skips duplicate product names.

**Images:** Saved under `artifacts/eynek-marketplace/public/product-images/horizon/`. Commit and deploy frontend so static paths work on Render. Rows without a scrapable image get the same brand placeholder file until real photos are uploaded.

**DB fields:** `status=Aktiv`, `approval_status=approved`, stock random 3–5, price from source page (JSON-LD / meta, converted to AZN).
