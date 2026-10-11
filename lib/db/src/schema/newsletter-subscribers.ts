import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const newsletterSubscribersTable = pgTable(
  "newsletter_subscribers",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("newsletter_subscribers_email_unique").on(table.email)],
);

export type NewsletterSubscriber = typeof newsletterSubscribersTable.$inferSelect;
