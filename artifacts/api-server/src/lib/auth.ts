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

function developmentOrigins() {
  if (process.env.NODE_ENV === "production") return [];
  const hosts = ["localhost", "127.0.0.1"];
  const ports = new Set<number>([5173, 5174, 5000]);
  const configured = Number(process.env.PORT);
  if (Number.isFinite(configured) && configured > 0) ports.add(configured);
  return hosts.flatMap((host) => [...ports].map((port) => `http://${host}:${port}`));
}

const trustedOrigins = [
  baseURL,
  ...developmentOrigins(),
  ...(process.env.AUTH_TRUSTED_ORIGINS ?? "").split(","),
]
  .map((origin) => origin?.trim())
  .filter((origin): origin is string => Boolean(origin));

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

export const googleSignInEnabled = Boolean(googleClientId && googleClientSecret);

export const auth = betterAuth({
  appName: "EYNƏK",
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
        subject: "EYNƏK — şifrəni yenilə",
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
        subject: "EYNƏK — e-poçtunu təsdiqlə",
        intro: "EYNƏK hesabını aktivləşdirmək üçün e-poçt ünvanını təsdiqlə.",
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
