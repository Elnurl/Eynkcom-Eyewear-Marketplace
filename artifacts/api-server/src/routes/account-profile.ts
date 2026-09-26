import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";

const areas = ["Bakı", "Abşeron"] as const;

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function textField(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  return value.trim().slice(0, max);
}

const router: IRouter = Router();

router.get("/account/profile", requireAuth, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const [user] = await db
    .select({
      name: usersTable.name,
      email: usersTable.email,
      phone: usersTable.phone,
      deliveryArea: usersTable.deliveryArea,
      deliveryAddress: usersTable.deliveryAddress,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.dbUser!.id))
    .limit(1);
  if (!user) {
    res.status(404).json({ error: "Hesab tapılmadı." });
    return;
  }
  const name = splitName(user.name);
  res.json({
    firstName: name.firstName,
    lastName: name.lastName,
    email: user.email,
    phone: user.phone ?? "",
    deliveryArea: user.deliveryArea === "Abşeron" ? "Abşeron" : "Bakı",
    deliveryAddress: user.deliveryAddress ?? "",
    paymentMethod: "pay_on_delivery",
  });
});

router.patch("/account/profile", requireAuth, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const body = req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    res.status(400).json({ error: "Məlumatları yoxlayın." });
    return;
  }
  const input = body as Record<string, unknown>;
  const next: Partial<typeof usersTable.$inferInsert> = {};

  if ("name" in input) {
    const name = textField(input.name, 80);
    if (!name || name.length < 2) {
      res.status(400).json({ error: "Ad və soyad ən azı 2 simvol olmalıdır." });
      return;
    }
    next.name = name;
  }
  if ("phone" in input) {
    const phone = textField(input.phone, 30);
    if (phone === null) {
      res.status(400).json({ error: "Telefon nömrəsini yoxlayın." });
      return;
    }
    if (phone && phone.length < 7) {
      res.status(400).json({ error: "Telefon nömrəsi ən azı 7 simvol olmalıdır." });
      return;
    }
    next.phone = phone || null;
  }
  if ("deliveryArea" in input) {
    const area = textField(input.deliveryArea, 20);
    if (!area || !areas.includes(area as (typeof areas)[number])) {
      res.status(400).json({ error: "Ərazini Bakı və ya Abşeron seçin." });
      return;
    }
    next.deliveryArea = area;
  }
  if ("deliveryAddress" in input) {
    const address = textField(input.deliveryAddress, 300);
    if (address === null) {
      res.status(400).json({ error: "Ünvanı yoxlayın." });
      return;
    }
    if (address && address.length < 5) {
      res.status(400).json({ error: "Ünvan ən azı 5 simvol olmalıdır." });
      return;
    }
    next.deliveryAddress = address || null;
  }

  if (Object.keys(next).length) {
    await db.update(usersTable).set(next).where(eq(usersTable.id, req.dbUser!.id));
  }
  res.json({ saved: true });
});

export default router;
