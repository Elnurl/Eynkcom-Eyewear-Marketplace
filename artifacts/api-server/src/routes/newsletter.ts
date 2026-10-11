import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, newsletterSubscribersTable } from "@workspace/db";
import { requireMarketplaceAdmin } from "./access";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/newsletter", async (req, res): Promise<void> => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLocaleLowerCase("en-US") : "";
  if (!emailPattern.test(email) || email.length > 254) {
    res.status(400).json({ error: "Düzgün e-poçt ünvanı yazın." });
    return;
  }

  await db
    .insert(newsletterSubscribersTable)
    .values({ id: randomUUID(), email })
    .onConflictDoNothing({ target: newsletterSubscribersTable.email });

  res.json({ ok: true });
});

router.get("/admin/newsletter", requireAuth, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!requireMarketplaceAdmin(req, res)) return;
  const rows = await db
    .select()
    .from(newsletterSubscribersTable)
    .orderBy(desc(newsletterSubscribersTable.createdAt));
  res.json(rows.map((row) => ({ id: row.id, email: row.email, createdAt: row.createdAt.toISOString() })));
});

export default router;
