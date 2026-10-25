import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  sellerApplicationsTable,
  sellerStoresTable,
  sellerSupportTicketsTable,
} from "@workspace/db";
import { imageBelongsToSeller, imageBelongsToUser, UPLOADED_IMAGE_PATH } from "../lib/productImages";
import { requireMarketplaceAdmin, requireUserEmail } from "./access";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

const MAX_MESSAGE = 4000;

async function activeStoreForUser(email: string) {
  const [store] = await db
    .select()
    .from(sellerStoresTable)
    .where(and(eq(sellerStoresTable.ownerEmail, email), eq(sellerStoresTable.status, "active")))
    .limit(1);
  return store ?? null;
}

function ticketDto(
  row: typeof sellerSupportTicketsTable.$inferSelect,
  storeName: string | null,
) {
  return {
    id: row.id,
    sellerId: row.sellerId,
    authorType: row.authorType,
    storeName,
    authorEmail: row.authorEmail,
    message: row.message,
    imagePath: row.imagePath,
    status: row.status,
    adminReadAt: row.adminReadAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function createInquiry(req: Request, res: Response): Promise<void> {
  const email = requireUserEmail(req, res);
  if (!email) return;

  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const imagePath = typeof req.body?.imagePath === "string" ? req.body.imagePath.trim() : "";

  if (message.length < 3) {
    res.status(400).json({ error: "Mesaj ən azı 3 simvol olmalıdır." });
    return;
  }
  if (message.length > MAX_MESSAGE) {
    res.status(400).json({ error: "Mesaj çox uzundur." });
    return;
  }
  if (imagePath && !UPLOADED_IMAGE_PATH.test(imagePath)) {
    res.status(400).json({ error: "Şəkil yolu düzgün deyil." });
    return;
  }

  const store = await activeStoreForUser(email);
  const authorType = store ? "seller" : "buyer";

  if (imagePath) {
    const imageOk = store
      ? await imageBelongsToSeller(imagePath, store.id)
      : await imageBelongsToUser(imagePath, req.dbUser!.id);
    if (!imageOk) {
      res.status(400).json({ error: "Şəkil sizə aid deyil." });
      return;
    }
  }

  const id = randomUUID();
  await db.insert(sellerSupportTicketsTable).values({
    id,
    sellerId: store?.id ?? null,
    authorType,
    authorUserId: req.dbUser!.id,
    authorEmail: email,
    message,
    imagePath: imagePath || null,
    status: "open",
  });

  req.log.info({ ticketId: id, authorType, sellerId: store?.id }, "User inquiry created");
  res.status(201).json({ id, ok: true });
}

router.post("/support/inquiries", requireAuth, async (req, res) => createInquiry(req, res));

/** @deprecated Prefer POST /support/inquiries */
router.post("/seller/support-tickets", requireAuth, async (req, res) => createInquiry(req, res));

router.get("/admin/inquiries/summary", requireAuth, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!requireMarketplaceAdmin(req, res)) return;

  const applications = await db
    .select({ id: sellerApplicationsTable.id })
    .from(sellerApplicationsTable)
    .where(inArray(sellerApplicationsTable.status, ["pending", "needs_changes"]));

  const support = await db
    .select({ id: sellerSupportTicketsTable.id })
    .from(sellerSupportTicketsTable)
    .where(
      and(
        eq(sellerSupportTicketsTable.status, "open"),
        isNull(sellerSupportTicketsTable.adminReadAt),
      ),
    );

  res.json({
    pendingApplications: applications.length,
    unreadSupportTickets: support.length,
    totalUnread: support.length,
  });
});

router.get("/admin/support-tickets", requireAuth, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!requireMarketplaceAdmin(req, res)) return;

  const rows = await db
    .select({ ticket: sellerSupportTicketsTable, storeName: sellerStoresTable.name })
    .from(sellerSupportTicketsTable)
    .leftJoin(sellerStoresTable, eq(sellerSupportTicketsTable.sellerId, sellerStoresTable.id))
    .orderBy(desc(sellerSupportTicketsTable.createdAt));

  res.json(rows.map((row) => ticketDto(row.ticket, row.storeName)));
});

router.patch("/admin/support-tickets/:id", requireAuth, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!requireMarketplaceAdmin(req, res)) return;

  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) {
    res.status(400).json({ error: "Sorğu id-si tələb olunur." });
    return;
  }
  const status = typeof req.body?.status === "string" ? req.body.status : "";
  const markRead = req.body?.markRead === true;

  const [existing] = await db
    .select()
    .from(sellerSupportTicketsTable)
    .where(eq(sellerSupportTicketsTable.id, id))
    .limit(1);
  if (!existing) {
    res.status(404).json({ error: "Sorğu tapılmadı." });
    return;
  }

  const patch: Partial<typeof sellerSupportTicketsTable.$inferInsert> = {};
  if (markRead) patch.adminReadAt = new Date();
  if (status === "open" || status === "closed") patch.status = status;

  if (!Object.keys(patch).length) {
    res.status(400).json({ error: "Dəyişiklik göndərilməyib." });
    return;
  }

  await db.update(sellerSupportTicketsTable).set(patch).where(eq(sellerSupportTicketsTable.id, id));
  res.json({ ok: true });
});

export default router;
