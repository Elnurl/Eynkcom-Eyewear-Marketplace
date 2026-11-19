import { Router, type IRouter } from "express";

const router: IRouter = Router();

const BAKU_VIEWBOX = "49.72,40.58,50.12,40.28";
const NOMINATIM_HEADERS = {
  Accept: "application/json",
  "User-Agent": "EYNƏK/eynek.store (delivery geocoding; contact@eynek.store)",
};

function formatNominatimRow(row: {
  display_name?: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}) {
  const a = row.address;
  if (a) {
    const parts = [
      a.amenity || a.building || a.shop,
      a.road,
      a.house_number ? `bina ${a.house_number}` : "",
      a.suburb || a.neighbourhood,
      a.city_district,
    ].filter(Boolean);
    if (parts.length >= 1) return parts.join(", ");
  }
  if (row.display_name) return row.display_name.split(",").slice(0, 5).join(", ");
  return "";
}

router.get("/geocode/search", async (req, res): Promise<void> => {
  const q = String(req.query.q ?? "").trim();
  const limit = Math.min(8, Math.max(1, Number(req.query.limit ?? 6) || 6));
  if (q.length < 2) {
    res.json({ results: [] });
    return;
  }
  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("q", `${q}, Bakı, Azerbaijan`);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("countrycodes", "az");
    url.searchParams.set("bounded", "1");
    url.searchParams.set("viewbox", BAKU_VIEWBOX);
    url.searchParams.set("addressdetails", "1");
    const response = await fetch(url.toString(), { headers: NOMINATIM_HEADERS });
    if (!response.ok) {
      res.status(502).json({ error: "Geocoding failed" });
      return;
    }
    const rows = (await response.json()) as {
      lat: string;
      lon: string;
      display_name?: string;
      address?: Record<string, string>;
    }[];
    const results = rows.map((row) => ({
      lat: Number(row.lat),
      lng: Number(row.lon),
      label: formatNominatimRow(row) || row.display_name || q,
      source: "nominatim" as const,
    }));
    res.json({ results });
  } catch {
    res.status(502).json({ error: "Geocoding failed" });
  }
});

router.get("/geocode/reverse", async (req, res): Promise<void> => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "Invalid coordinates" });
    return;
  }
  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "json");
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("accept-language", "az,en");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("zoom", "18");
    const response = await fetch(url.toString(), { headers: NOMINATIM_HEADERS });
    if (!response.ok) {
      res.status(502).json({ error: "Reverse geocoding failed" });
      return;
    }
    const data = (await response.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const label = formatNominatimRow({ lat: String(lat), lon: String(lng), ...data });
    res.json({ label: label || data.display_name || "" });
  } catch {
    res.status(502).json({ error: "Reverse geocoding failed" });
  }
});

export default router;