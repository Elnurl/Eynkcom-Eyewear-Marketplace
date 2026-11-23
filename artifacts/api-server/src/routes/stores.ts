import { Router, type IRouter } from "express";
import { and, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
import {
  GetSellerStoreResponse,
  ListStoresResponse,
  UpdateSellerStoreBody,
  UpdateSellerStoreResponse,
} from "@workspace/api-zod";
import { db, sellerApplicationsTable, sellerProductsTable, sellerStoresTable, usersTable } from "@workspace/db";
import { imageBelongsToSeller, UPLOADED_IMAGE_PATH } from "../lib/productImages";
import { requireUserEmail } from "./access";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

function formatStore(
  store: typeof sellerStoresTable.$inferSelect,
  productCount: number,
  contact?: { email: string; phone: string },
) {
  const words = store.name.trim().split(/\s+/).filter(Boolean);
  const initials = words.slice(0, 2).map((word) => word[0]).join("").toLocaleUpperCase("az");
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    location: store.location,
    description: store.description,
    ...(contact ? { email: contact.email, phone: contact.phone } : {}),
    logoPath: store.logoPath ?? null,
    instagram: store.instagram,
    website: store.website,
    vitrineTheme: store.vitrineTheme ?? null,
    status: store.status,
    productCount,
    initials: initials || "S",
    since: `${store.createdAt.getFullYear()}-dən`,
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
  };
}

function storeContact(store: typeof sellerStoresTable.$inferSelect) {
  return {
    email: store.ownerEmail.trim().toLocaleLowerCase("en-US"),
    phone: store.phone?.trim() ?? "",
  };
}

async function getPublicProductCounts(storeIds: string[]): Promise<Map<string, number>> {
  if (storeIds.length === 0) return new Map();
  const counts = await db
    .select({ sellerId: sellerProductsTable.sellerId, productCount: count() })
    .from(sellerProductsTable)
    .where(
      and(
        inArray(sellerProductsTable.sellerId, storeIds),
        eq(sellerProductsTable.approvalStatus, "approved"),
      ),
    )
    .groupBy(sellerProductsTable.sellerId);
  return new Map(counts.map((row) => [row.sellerId, row.productCount]));
}

router.get("/stores", async (req, res): Promise<void> => {
  const stores = await db
    .select()
    .from(sellerStoresTable)
    .where(eq(sellerStoresTable.status, "active"))
    .orderBy(desc(sellerStoresTable.createdAt));
  const counts = await getPublicProductCounts(stores.map((store) => store.id));
  res.json(ListStoresResponse.parse(stores.map((store) => formatStore(store, counts.get(store.id) ?? 0))));
});

router.get("/seller/store", requireAuth, async (req, res): Promise<void> => {
  const email = requireUserEmail(req, res);
  if (!email) return;

  const [store] = await db
    .select()
    .from(sellerStoresTable)
    .where(and(eq(sellerStoresTable.ownerEmail, email), eq(sellerStoresTable.status, "active")))
    .limit(1);
  if (!store) {
    res.status(403).json({ error: "Satıcı mağazası təsdiqlənməyib." });
    return;
  }

  const counts = await getPublicProductCounts([store.id]);
  res.json(GetSellerStoreResponse.parse(formatStore(store, counts.get(store.id) ?? 0, storeContact(store))));
});

router.patch("/seller/store", requireAuth, async (req, res): Promise<void> => {
  const email = requireUserEmail(req, res);
  if (!email) return;
  const parsed = UpdateSellerStoreBody.safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Mağaza məlumatları düzgün deyil." });
    return;
  }

  const [existing] = await db
    .select()
    .from(sellerStoresTable)
    .where(and(eq(sellerStoresTable.ownerEmail, email), eq(sellerStoresTable.status, "active")))
    .limit(1);
  if (!existing) {
    res.status(403).json({ error: "Satıcı mağazası təsdiqlənməyib." });
    return;
  }

  const { email: nextEmailRaw, phone: nextPhoneRaw, ...profile } = parsed.data;
  const updates: Record<string, unknown> = { ...profile };
  if (typeof nextPhoneRaw === "string") {
    updates.phone = nextPhoneRaw.trim();
  }
  const nextEmail = typeof nextEmailRaw === "string" ? nextEmailRaw.trim().toLocaleLowerCase("en-US") : "";
  if (nextEmail && nextEmail !== email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      res.status(400).json({ error: "E-poçt ünvanı düzgün deyil." });
      return;
    }
    const [emailTaken] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(sql`lower(${usersTable.email}) = ${nextEmail}`, ne(usersTable.id, req.dbUser!.id)))
      .limit(1);
    const [storeTaken] = await db
      .select({ id: sellerStoresTable.id })
      .from(sellerStoresTable)
      .where(and(eq(sellerStoresTable.ownerEmail, nextEmail), ne(sellerStoresTable.id, existing.id)))
      .limit(1);
    if (emailTaken || storeTaken) {
      res.status(409).json({ error: "Bu e-poçt artıq başqa hesaba bağlıdır." });
      return;
    }
    updates.ownerEmail = nextEmail;
  }
  if (Object.prototype.hasOwnProperty.call(parsed.data, "logoPath")) {
    const raw = parsed.data.logoPath;
    const logoPath = typeof raw === "string" && raw.trim() ? raw.trim() : null;
    if (logoPath && !UPLOADED_IMAGE_PATH.test(logoPath)) {
      res.status(400).json({ error: "Loqo yolu düzgün deyil." });
      return;
    }
    if (logoPath && !(await imageBelongsToSeller(logoPath, existing.id))) {
      res.status(400).json({ error: "Loqo şəkli sizə aid deyil." });
      return;
    }
    updates.logoPath = logoPath;
  }
  if (Object.prototype.hasOwnProperty.call(parsed.data, "vitrineTheme")) {
    const theme = parsed.data.vitrineTheme;
    if (theme === null) {
      updates.vitrineTheme = null;
    } else if (theme && typeof theme === "object") {
      const heroMediaPath =
        typeof theme.heroMediaPath === "string" && theme.heroMediaPath.trim()
          ? theme.heroMediaPath.trim()
          : theme.heroMediaPath === null
            ? null
            : undefined;
      if (heroMediaPath) {
        if (!UPLOADED_IMAGE_PATH.test(heroMediaPath)) {
          res.status(400).json({ error: "Vitrin fon faylının yolu düzgün deyil." });
          return;
        }
        if (!(await imageBelongsToSeller(heroMediaPath, existing.id))) {
          res.status(400).json({ error: "Vitrin fon faylı sizə aid deyil." });
          return;
        }
      }
      updates.vitrineTheme = {
        ...theme,
        ...(heroMediaPath !== undefined ? { heroMediaPath } : {}),
      };
    }
  }

  const store = await db.transaction(async (tx) => {
    if (updates.ownerEmail) {
      await tx
        .update(usersTable)
        .set({ email: String(updates.ownerEmail), updatedAt: new Date() })
        .where(eq(usersTable.id, req.dbUser!.id));
      await tx
        .update(sellerApplicationsTable)
        .set({ email: String(updates.ownerEmail), updatedAt: new Date() })
        .where(sql`lower(${sellerApplicationsTable.email}) = ${email}`);
    }
    if (typeof updates.phone === "string") {
      await tx
        .update(usersTable)
        .set({ phone: String(updates.phone), updatedAt: new Date() })
        .where(eq(usersTable.id, req.dbUser!.id));
    }
    const [saved] = await tx
      .update(sellerStoresTable)
      .set(updates)
      .where(eq(sellerStoresTable.id, existing.id))
      .returning();
    return saved;
  });
  if (!store) {
    res.status(403).json({ error: "Satıcı mağazası təsdiqlənməyib." });
    return;
  }
  const counts = await getPublicProductCounts([store.id]);
  res.json(UpdateSellerStoreResponse.parse(formatStore(store, counts.get(store.id) ?? 0, storeContact(store))));
});

export default router;