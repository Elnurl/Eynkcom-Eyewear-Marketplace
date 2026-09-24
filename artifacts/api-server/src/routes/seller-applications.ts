import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  CreateSellerApplicationBody,
  CreateSellerApplicationResponse,
  ListAdminSellerApplicationsQueryParams,
  ListAdminSellerApplicationsResponse,
  ListMySellerApplicationsResponse,
  ReviewSellerApplicationBody,
  ReviewSellerApplicationParams,
  ReviewSellerApplicationResponse,
} from "@workspace/api-zod";
import {
  db,
  sellerApplicationsTable,
  sellerStoresTable,
  usersTable,
} from "@workspace/db";
import { requireMarketplaceAdmin, requireUserEmail } from "./access";

const router: IRouter = Router();

function serializeApplication(application: typeof sellerApplicationsTable.$inferSelect) {
  return {
    ...application,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString(),
  };
}

function makeSlug(value: string, id: string): string {
  const base = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/ə/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${base || "optika"}-${id.slice(0, 6)}`;
}

router.post("/seller/applications", async (req, res): Promise<void> => {
  const parsed = CreateSellerApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.issues }, "Invalid seller application");
    res.status(400).json({ error: "Müraciət məlumatları düzgün deyil." });
    return;
  }

  const application = {
    id: randomUUID(),
    ...parsed.data,
    email: parsed.data.email.trim().toLocaleLowerCase("en-US"),
    tax: parsed.data.tax ?? "",
    instagram: parsed.data.instagram ?? "",
    website: parsed.data.website ?? "",
    status: "pending",
    reviewNotes: null,
  };
  const [saved] = await db.insert(sellerApplicationsTable).values(application).returning();
  req.log.info({ applicationId: saved.id }, "Seller application created");
  res.status(201).json(CreateSellerApplicationResponse.parse(serializeApplication(saved)));
});

router.get("/seller/applications/mine", async (req, res): Promise<void> => {
  const email = requireUserEmail(req, res);
  if (!email) return;
  const applications = await db
    .select()
    .from(sellerApplicationsTable)
    .where(eq(sellerApplicationsTable.email, email))
    .orderBy(desc(sellerApplicationsTable.createdAt));
  res.json(ListMySellerApplicationsResponse.parse(applications.map(serializeApplication)));
});

router.get("/admin/seller-applications", async (req, res): Promise<void> => {
  if (!requireMarketplaceAdmin(req, res)) return;
  const query = ListAdminSellerApplicationsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Müraciət filtri düzgün deyil." });
    return;
  }
  const applications = await db
    .select()
    .from(sellerApplicationsTable)
    .where(
      query.data.status
        ? eq(sellerApplicationsTable.status, query.data.status)
        : undefined,
    )
    .orderBy(desc(sellerApplicationsTable.createdAt));
  res.json(ListAdminSellerApplicationsResponse.parse(applications.map(serializeApplication)));
});

router.patch("/admin/seller-applications/:id", async (req, res): Promise<void> => {
  if (!requireMarketplaceAdmin(req, res)) return;
  const params = ReviewSellerApplicationParams.safeParse(req.params);
  const body = ReviewSellerApplicationBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Müraciət qərarı düzgün deyil." });
    return;
  }

  const result = await db.transaction(async (tx) => {
    const [application] = await tx
      .select()
      .from(sellerApplicationsTable)
      .where(eq(sellerApplicationsTable.id, params.data.id))
      .limit(1);
    if (!application) return { kind: "missing" as const };

    const email = application.email.trim().toLocaleLowerCase("en-US");
    if (body.data.status === "approved") {
      const [registeredUser] = await tx
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(sql`lower(${usersTable.email}) = ${email}`)
        .limit(1);
      if (!registeredUser) return { kind: "seller-not-registered" as const };

      const storeId = randomUUID();
      await tx
        .insert(sellerStoresTable)
        .values({
          id: storeId,
          ownerEmail: email,
          name: application.storeName,
          slug: makeSlug(application.storeName, storeId),
          location: application.address,
          description: application.business,
          instagram: application.instagram,
          website: application.website,
          status: "active",
        })
        .onConflictDoUpdate({
          target: sellerStoresTable.ownerEmail,
          set: {
            name: application.storeName,
            location: application.address,
            description: application.business,
            instagram: application.instagram,
            website: application.website,
            status: "active",
            updatedAt: new Date(),
          },
        });
    } else {
      await tx
        .update(sellerStoresTable)
        .set({ status: "inactive", updatedAt: new Date() })
        .where(eq(sellerStoresTable.ownerEmail, email));
    }

    const [saved] = await tx
      .update(sellerApplicationsTable)
      .set({
        status: body.data.status,
        reviewNotes: body.data.reviewNotes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(sellerApplicationsTable.id, application.id))
      .returning();
    return { kind: "saved" as const, application: saved };
  });

  if (result.kind === "missing") {
    res.status(404).json({ error: "Satıcı müraciəti tapılmadı." });
    return;
  }
  if (result.kind === "seller-not-registered") {
    res.status(409).json({
      error: "Təsdiqdən əvvəl müraciətdəki e-poçtla satıcı hesabına ən azı bir dəfə daxil olun.",
    });
    return;
  }
  res.json(ReviewSellerApplicationResponse.parse(serializeApplication(result.application)));
});

export default router;