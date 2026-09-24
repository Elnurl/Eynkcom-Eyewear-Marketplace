import type { Request, Response } from "express";

export function requireUserEmail(req: Request, res: Response): string | null {
  const email = req.user?.email?.trim().toLocaleLowerCase("en-US");
  if (!req.isAuthenticated() || !email) {
    res.status(401).json({ error: "Daxil olmaq tələb olunur." });
    return null;
  }
  return email;
}

export function requireMarketplaceAdmin(req: Request, res: Response): boolean {
  const email = requireUserEmail(req, res);
  if (!email) return false;

  const adminEmail = process.env.MARKETPLACE_ADMIN_EMAIL?.trim().toLocaleLowerCase("en-US");
  if (!adminEmail) {
    res.status(503).json({ error: "Marketplace administrator is not configured." });
    return false;
  }
  if (email !== adminEmail) {
    res.status(403).json({ error: "Marketplace administrator access required." });
    return false;
  }
  return true;
}