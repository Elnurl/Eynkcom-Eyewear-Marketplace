import { desc } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { GetAdminAccessResponse, ListAdminUsersResponse } from "@workspace/api-zod";
import { db, sellerStoresTable, usersTable } from "@workspace/db";
import { requireMarketplaceAdmin } from "./access";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/admin/access", requireAuth, (req, res): void => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!requireMarketplaceAdmin(req, res)) return;
  res.json(GetAdminAccessResponse.parse({ authorized: true }));
});

router.get("/admin/users", requireAuth, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  if (!requireMarketplaceAdmin(req, res)) return;

  const [users, stores] = await Promise.all([
    db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .orderBy(desc(usersTable.createdAt)),
    db.select({ ownerEmail: sellerStoresTable.ownerEmail }).from(sellerStoresTable),
  ]);
  const sellerEmails = new Set(
    stores.map((store) => store.ownerEmail.trim().toLocaleLowerCase("en-US")),
  );
  const adminEmail = process.env.MARKETPLACE_ADMIN_EMAIL?.trim().toLocaleLowerCase("en-US");

  res.json(
    ListAdminUsersResponse.parse(
      users.map((user) => {
        const email = user.email.trim().toLocaleLowerCase("en-US");
        return {
          ...user,
          accountType:
            email && email === adminEmail
              ? "admin"
              : email && sellerEmails.has(email)
                ? "seller"
                : "buyer",
        };
      }),
    ),
  );
});

export default router;