#!/usr/bin/env python3
"""Import Horizon Optic products from EYNƏK Excel into seller_products (approved, active)."""

from __future__ import annotations

import json
import os
import random
import re
import sys
import time
import uuid
from pathlib import Path
from urllib.parse import urljoin, urlparse

import openpyxl
import requests

REPO_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = REPO_ROOT / ".env"
XLSX_DEFAULT = Path.home() / "Downloads" / "EYNEK_ilk_mehsullar_siyahisi (1).xlsx"
IMAGE_DIR = REPO_ROOT / "artifacts" / "eynek-marketplace" / "public" / "product-images" / "horizon"

STORE_OWNER = "eeenu7@gmail.com"
DRY_RUN = "--dry-run" in sys.argv
ENSURE_STORE = "--ensure-store" in sys.argv
XLSX_PATH = Path(sys.argv[sys.argv.index("--xlsx") + 1]) if "--xlsx" in sys.argv else XLSX_DEFAULT

SESSION = requests.Session()
SESSION.headers.update(
    {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    }
)

FX_TO_AZN = {"USD": 1.7, "CAD": 1.25, "EUR": 1.85, "GBP": 2.15, "AUD": 1.1, "NZD": 1.0, "AZN": 1.0}


def load_database_url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if url:
        return url
    if not ENV_PATH.is_file():
        raise SystemExit(f"Missing {ENV_PATH}")
    for line in ENV_PATH.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("DATABASE_URL="):
            return line.split("=", 1)[1].strip().strip('"').strip("'")
    raise SystemExit("DATABASE_URL not found in .env")


def slugify(text: str) -> str:
    s = text.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s[:80] or "product"


def map_gender(value: str) -> str:
    v = (value or "").strip()
    if v.lower() == "unisex":
        return "Uniseks"
    if v in ("Qadın", "Kişi", "Uniseks"):
        return v
    return "Uniseks"


def map_shape(value: str, name: str) -> str:
    v = (value or "").strip()
    allowed = {"Aviator", "Cat-Eye", "Rectangle", "Round", "Square", "Wayfarer"}
    if v in allowed:
        return v
    if v.lower() == "geometric":
        return "Square"
    n = name.lower()
    if "wayfarer" in n:
        return "Wayfarer"
    if "aviator" in n:
        return "Aviator"
    if "round" in n:
        return "Round"
    return "Square"


def map_material(value: str) -> str:
    v = (value or "").strip()
    allowed = {"Asetat", "Metal", "Titanium", "Bio-nylon"}
    if v in allowed:
        return v
    if v.lower() in ("plastik", "o matter", "plastic"):
        return "Bio-nylon"
    return "Asetat"


def parse_json_ld(html: str) -> list[dict]:
    blocks: list[dict] = []
    for m in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        re.I | re.S,
    ):
        raw = m.group(1).strip()
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if isinstance(data, list):
            blocks.extend(x for x in data if isinstance(x, dict))
        elif isinstance(data, dict):
            blocks.append(data)
            if "@graph" in data and isinstance(data["@graph"], list):
                blocks.extend(x for x in data["@graph"] if isinstance(x, dict))
    return blocks


def extract_price_azn(html: str) -> int | None:
    for block in parse_json_ld(html):
        if block.get("@type") not in ("Product", "ProductGroup", None):
            continue
        offers = block.get("offers")
        if isinstance(offers, list):
            offers = offers[0] if offers else None
        if not isinstance(offers, dict):
            continue
        price = offers.get("price") or offers.get("lowPrice")
        currency = (offers.get("priceCurrency") or "USD").upper()
        if price is None:
            continue
        try:
            amount = float(str(price).replace(",", ""))
        except ValueError:
            continue
        rate = FX_TO_AZN.get(currency, 1.7)
        return max(1, int(round(amount * rate)))

    for pat in (
        r'"price"\s*:\s*"([\d.]+)"',
        r'"price"\s*:\s*([\d.]+)',
        r'itemprop="price"\s+content="([\d.]+)"',
        r'data-product-price="([\d.]+)"',
    ):
        m = re.search(pat, html)
        if m:
            try:
                return max(1, int(round(float(m.group(1)) * 1.7)))
            except ValueError:
                pass
    m = re.search(r"\$\s*([\d]{2,4}(?:\.\d{2})?)", html)
    if m:
        return max(1, int(round(float(m.group(1)) * 1.7)))
    return None


def extract_image_urls(html: str, page_url: str) -> list[str]:
    urls: list[str] = []
    for block in parse_json_ld(html):
        if block.get("@type") in ("Product", "ProductGroup"):
            img = block.get("image")
            if isinstance(img, str):
                urls.append(img)
            elif isinstance(img, list):
                urls.extend(i for i in img if isinstance(i, str))
    for prop in ("og:image", "twitter:image"):
        m = re.search(
            rf'<meta[^>]+property=["\']{prop}["\'][^>]+content=["\']([^"\']+)["\']',
            html,
            re.I,
        )
        if m:
            urls.append(m.group(1))
    img_hits = 0
    for m in re.finditer(r'<img[^>]+(?:src|data-src)=["\']([^"\']+)["\']', html, re.I):
        if img_hits >= 40:
            break
        src = m.group(1)
        if any(x in src.lower() for x in ("logo", "icon", "sprite", "pixel", "1x1", "badge", "banner")):
            continue
        if any(
            x in src.lower()
            for x in ("product", "ray-ban", "oakley", "rb3", "rb2", "oo9102", "/images/", "cdn", "wcsstore")
        ):
            urls.append(src)
            img_hits += 1
    seen: set[str] = set()
    out: list[str] = []
    for u in urls:
        if not u:
            continue
        full = urljoin(page_url, u)
        if full not in seen:
            seen.add(full)
            out.append(full)
    return out


def download_image(url: str, dest: Path) -> bool:
    try:
        r = SESSION.get(url, timeout=45)
        r.raise_for_status()
        ctype = r.headers.get("content-type", "")
        if "image" not in ctype and not url.lower().split("?")[0].endswith((".jpg", ".jpeg", ".png", ".webp")):
            return False
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(r.content)
        return dest.stat().st_size > 5000
    except requests.RequestException:
        return False


def fetch_page(url: str) -> str | None:
    if not url or not url.startswith("http"):
        return None
    try:
        r = SESSION.get(url, timeout=45, allow_redirects=True)
        if r.status_code >= 400:
            return None
        return r.text
    except requests.RequestException:
        return None


def read_products_from_xlsx(path: Path) -> list[dict]:
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    ws = wb["Məhsullar"]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    header = [str(c).strip() if c else "" for c in rows[0]]
    idx = {name: i for i, name in enumerate(header)}
    products: list[dict] = []
    for row in rows[2:]:
        if not row or not row[idx.get("№", 0)]:
            continue
        num = row[idx["№"]]
        if str(num).strip().upper() == "NÜMUNƏ" or num == "NÜMUNƏ":
            continue
        try:
            n = int(num)
        except (TypeError, ValueError):
            continue
        if n < 1 or n > 30:
            continue
        name = str(row[idx["Məhsul adı"]] or "").strip()
        if not name:
            continue
        products.append(
            {
                "num": n,
                "name": name,
                "category": str(row[idx["Kateqoriya"]] or "Gün eynəyi").strip(),
                "status": "Aktiv",
                "color": str(row[idx["Rəng"]] or "Qara").strip(),
                "material": str(row[idx["Material"]] or "").strip(),
                "brand": str(row[idx["Brend"]] or "").strip(),
                "gender": str(row[idx["Cins"]] or "").strip(),
                "shape": str(row[idx["Forma"]] or "").strip(),
                "size": str(row[idx["Ölçü"]] or "M").strip(),
                "description": str(row[idx["Təsvir"]] or "").strip(),
                "source_url": str(
                    row[idx["Mənbə (səhifə)"] if "Mənbə (səhifə)" in idx else idx.get("Mənbə", 16)]
                    or ""
                ).strip(),
            }
        )
    return products


def ensure_psycopg2():
    try:
        import psycopg2  # noqa: F401
    except ImportError:
        import subprocess

        subprocess.check_call([sys.executable, "-m", "pip", "install", "psycopg2-binary", "-q"])


def main() -> None:
    if not XLSX_PATH.is_file():
        raise SystemExit(f"Excel not found: {XLSX_PATH}")

    products = read_products_from_xlsx(XLSX_PATH)
    print(f"Loaded {len(products)} rows from Excel")

    report: list[dict] = []
    prepared: list[dict] = []

    for p in products:
        slug = slugify(f"{p['brand']}-{p['name']}-{p['num']}")
        html = fetch_page(p["source_url"])
        price = extract_price_azn(html) if html else None
        if price is None:
            price = 320 if p["brand"].lower() == "oakley" else 285

        images: list[str] = extract_image_urls(html, p["source_url"]) if html else []
        on_path = IMAGE_DIR / f"{slug}-on.jpg"
        yan_path = IMAGE_DIR / f"{slug}-yan.jpg"
        front_db = f"product-images/horizon/{slug}-on.jpg"
        side_db = f"product-images/horizon/{slug}-yan.jpg"

        img_ok = False
        if not DRY_RUN and on_path.is_file() and on_path.stat().st_size > 5000:
            img_ok = yan_path.is_file() and yan_path.stat().st_size > 5000
            if not img_ok and on_path.is_file():
                yan_path.write_bytes(on_path.read_bytes())
                img_ok = True
        if not DRY_RUN and not img_ok and images:
            for u in images[:20]:
                if download_image(u, on_path):
                    img_ok = True
                    break
            if img_ok:
                side_src = images[1] if len(images) > 1 else images[0]
                if not download_image(side_src, yan_path):
                    yan_path.write_bytes(on_path.read_bytes())

        stock = random.randint(3, 5)
        prepared.append(
            {
                **p,
                "id": str(uuid.uuid4()),
                "price": price,
                "stock": stock,
                "gender": map_gender(p["gender"]),
                "shape": map_shape(p["shape"], p["name"]),
                "material": map_material(p["material"]),
                "frontImage": front_db,
                "sideImage": side_db,
                "img_ok": img_ok,
            }
        )
        report.append({"num": p["num"], "name": p["name"], "price": price, "stock": stock, "images": len(images), "img_ok": img_ok})
        time.sleep(0.35)

    if not DRY_RUN:
        templates: dict[str, Path] = {}
        for item in prepared:
            if item["img_ok"]:
                templates.setdefault(item["brand"], IMAGE_DIR / f"{slugify(item['brand'])}-template-on.jpg")
                src_on = IMAGE_DIR / Path(item["frontImage"]).name
                if src_on.is_file() and not templates[item["brand"]].is_file():
                    templates[item["brand"]].write_bytes(src_on.read_bytes())
        for item in prepared:
            if item["img_ok"]:
                continue
            tpl = templates.get(item["brand"])
            if not tpl or not tpl.is_file():
                continue
            slug = slugify(f"{item['brand']}-{item['name']}-{item['num']}")
            on_path = IMAGE_DIR / f"{slug}-on.jpg"
            yan_path = IMAGE_DIR / f"{slug}-yan.jpg"
            on_path.write_bytes(tpl.read_bytes())
            yan_path.write_bytes(tpl.read_bytes())
            item["img_ok"] = True
            item["frontImage"] = f"product-images/horizon/{slug}-on.jpg"
            item["sideImage"] = f"product-images/horizon/{slug}-yan.jpg"

    print(json.dumps(report, ensure_ascii=False, indent=2))

    if DRY_RUN:
        print("Dry run — no database writes.")
        return

    ensure_psycopg2()
    import psycopg2

    conn = psycopg2.connect(load_database_url())
    conn.autocommit = False
    cur = conn.cursor()
    cur.execute(
        "SELECT id, name FROM seller_stores WHERE lower(owner_email) = lower(%s) LIMIT 1",
        (STORE_OWNER,),
    )
    row = cur.fetchone()
    if not row:
        if not ENSURE_STORE:
            conn.rollback()
            conn.close()
            raise SystemExit(
                f"No store for {STORE_OWNER}. Use --ensure-store (local dev) or import on production DB."
            )
        seller_id = str(uuid.uuid4())
        cur.execute(
            """
            INSERT INTO seller_stores (id, owner_email, name, slug, location, description, status)
            VALUES (%s, %s, %s, %s, %s, %s, 'active')
            """,
            (
                seller_id,
                STORE_OWNER,
                "Horizon Optic",
                "horizon-optic",
                "Bakı",
                "Horizon Optic — EYNƏK satıcı mağazası.",
            ),
        )
        print(f"Created dev store Horizon Optic ({seller_id})")
    else:
        seller_id = row[0]
        print(f"Store: {row[1]} ({seller_id})")

    inserted = 0
    skipped = 0
    for p in prepared:
        cur.execute(
            "SELECT id FROM seller_products WHERE seller_id = %s AND name = %s LIMIT 1",
            (seller_id, p["name"]),
        )
        if cur.fetchone():
            skipped += 1
            continue
        if not p["img_ok"]:
            print(f"Skip DB insert (no image): {p['name']}")
            continue
        cur.execute(
            """
            INSERT INTO seller_products (
              id, seller_id, name, category, price, stock, color, material, brand,
              gender, shape, size, description, status, approval_status, moderation_note,
              front_image, side_image
            ) VALUES (
              %s, %s, %s, %s, %s, %s, %s, %s, %s,
              %s, %s, %s, %s, %s, %s, NULL,
              %s, %s
            )
            """,
            (
                p["id"],
                seller_id,
                p["name"],
                p["category"],
                p["price"],
                p["stock"],
                p["color"],
                p["material"],
                p["brand"],
                p["gender"],
                p["shape"],
                p["size"],
                p["description"][:1000],
                p["status"],
                "approved",
                p["frontImage"],
                p["sideImage"],
            ),
        )
        inserted += 1

    conn.commit()
    cur.execute("SELECT count(*) FROM seller_products WHERE seller_id = %s", (seller_id,))
    total = cur.fetchone()[0]
    conn.close()
    print(f"Inserted {inserted}, skipped {skipped} (duplicate names). Store now has {total} products.")


if __name__ == "__main__":
    main()
