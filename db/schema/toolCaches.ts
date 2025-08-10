import { relations } from "drizzle-orm";
import { bigint, jsonb, pgTable, uniqueIndex } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { mailboxes } from "./mailboxes";
import { platformCustomers } from "./platformCustomers";

export type ToolCache = typeof toolCaches.$inferSelect;

export const toolCaches = pgTable(
  "tool_caches",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    mailboxId: bigint({ mode: "number" }).notNull().references(() => mailboxes.id),
    platformCustomerId: bigint("platform_customer_id", { mode: "number" }).references(
      () => platformCustomers.id,
    ),
    tools: jsonb().notNull(),
  },
  (table) => [
    uniqueIndex("tool_caches_mailbox_customer_idx").on(
      table.mailboxId,
      table.platformCustomerId,
    ),
  ],
).enableRLS();

export const toolCachesRelations = relations(toolCaches, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [toolCaches.mailboxId],
    references: [mailboxes.id],
  }),
  platformCustomer: one(platformCustomers, {
    fields: [toolCaches.platformCustomerId],
    references: [platformCustomers.id],
  }),
}));
