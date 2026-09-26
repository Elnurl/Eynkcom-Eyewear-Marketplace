import type { IncomingHttpHeaders } from "node:http";
import { betterAuth } from "better-auth";
import { fromNodeHeaders } from "better-auth/node";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import {
  authAccountsTable,
  authSessionsTable,
  authVerificationsTable,
  db,
  usersTable,
} from "@workspace/db";
import { actionEmail, sendEmail } from "./email";

const baseURL = process.env.BETTER_AUTH_URL?.trim() || undefined;
const trustedOrigins = [baseURL, ...(process.env.AUTH_TRUSTED_ORIGINS ?? "").split(",")]
  .map((origin) => origin?.trim())
  .filter((origin): origin is string => Boolean(origin));

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

export const googleSignInEnabled = Boolean(googleClientId && googleClientSecret);

export const auth = betterAuth({
  appName: "EYNƏK.com",
  baseURL,
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: usersTable,
      session: authSessionsTable,
      account: authAccountsTable,
      verification: authVerificationsTable,
    },
  }),
  // Seller and admin rights are granted by email address, so an email must be
  // proven before it can hold a session.
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // Not awaited: response time must not reveal whether the account exists.
      void sendEmail(actionEmail({
        to: user.email,
        subject: "EYNƏK.com — şifrəni yenilə",
        intro: "Hesabının şifrəsini yeniləmək üçün sorğu aldıq.",
        action: "Yeni şifrə təyin et",
        url,
        outro: "Bu sorğunu sən göndərməmisənsə, bu məktubu nəzərə alma. Link 1 saat etibarlıdır.",
      }));
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail(actionEmail({
        to: user.email,
        subject: "EYNƏK.com — e-poçtunu təsdiqlə",
        intro: "EYNƏK.com hesabını aktivləşdirmək üçün e-poçt ünvanını təsdiqlə.",
        action: "E-poçtu təsdiqlə",
        url,
        outro: "Hesab yaratmamısansa, bu məktubu nəzərə alma.",
      }));
    },
  },
  socialProviders: googleSignInEnabled
    ? { google: { clientId: googleClientId!, clientSecret: googleClientSecret! } }
    : {},
});

export type RequestSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export async function getRequestSession(req: { headers: IncomingHttpHeaders }): Promise<RequestSession> {
  return auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
}
