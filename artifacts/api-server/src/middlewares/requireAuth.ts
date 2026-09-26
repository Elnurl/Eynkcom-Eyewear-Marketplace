import type { NextFunction, Request, Response } from "express";
import type { User } from "@workspace/db";
import { getRequestSession } from "../lib/auth";

declare global {
  namespace Express {
    interface Request {
      dbUser?: User;
    }
  }
}

// The session comes from Better Auth's signed cookie; identity is never read
// from request headers or the body.
async function attachUser(req: Request, res: Response, next: NextFunction, optional: boolean): Promise<void> {
  try {
    const session = await getRequestSession(req);
    if (!session) {
      if (optional) {
        next();
        return;
      }
      res.status(401).json({ error: "Daxil olmaq tələb olunur." });
      return;
    }
    if (!session.user.emailVerified) {
      res.status(401).json({ error: "E-poçt ünvanınızı təsdiqləyin." });
      return;
    }
    req.dbUser = session.user as User;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  return attachUser(req, res, next, false);
}

export function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  return attachUser(req, res, next, true);
}
