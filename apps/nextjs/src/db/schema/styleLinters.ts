import { bigint, index, pgTable, text } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";

export const styleLinters = pgTable(
  "mailboxes_stylelinter",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    before: text().notNull(),
    after: text().notNull(),
    clerkOrganizationId: text().notNull(),
  },
  (table) => ({
    createdAtIdx: index("mailboxes_stylelinter_created_at_05c6d9c6").on(table.createdAt),
    clerkOrganizationIdIdx: index("mailboxes_stylelinter_clerk_organization_id").on(table.clerkOrganizationId),
  }),
);
