import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db, usersTable, type User } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      dbUser?: User;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Daxil olmaq tələb olunur." });
    return;
  }

  // The Replit-managed Clerk provisioner configures a custom session-token
  // template containing userId (externalId for migrated users, native ID for
  // new users) and email. getAuth only exposes these claims after
  // clerkMiddleware has verified the signed session. Neither value is read
  // from request headers or the request body.
  const claims = auth.sessionClaims as Record<string, unknown> | undefined;
  const localUserId = claims?.userId;
  if (typeof localUserId !== "string" || !localUserId) {
    res.status(401).json({ error: "İstifadəçi sessiyası etibarlı deyil." });
    return;
  }
  const email = typeof claims?.email === "string"
    ? claims.email.trim().toLocaleLowerCase("en-US")
    : "";
  if (!email) {
    res.status(401).json({ error: "İstifadəçi sessiyasında e-poçt ünvanı yoxdur." });
    return;
  }

  try {
    let [dbUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, localUserId))
      .limit(1);

    // A new Clerk account may create its own local row. A migrated account
    // with a different externalId must already have its migrated local row:
    // never create an unrelated legacy ID from a missing mapping.
    if (!dbUser && localUserId === auth.userId) {
      const [inserted] = await db
        .insert(usersTable)
        .values({ id: localUserId, email })
        .onConflictDoNothing()
        .returning();
      dbUser = inserted;

      // Re-read after a conflict to support simultaneous first requests. If
      // the email unique constraint belongs to another local ID, do not link
      // this Clerk session to that account.
      if (!dbUser) {
        [dbUser] = await db
          .select()
          .from(usersTable)
          .where(eq(usersTable.id, localUserId))
          .limit(1);
      }
    }

    if (!dbUser) {
      res.status(403).json({ error: "Bu hesabın yerli istifadəçi profili mövcud deyil." });
      return;
    }

    req.dbUser = dbUser;
    next();
  } catch (error) {
    next(error);
  }
}