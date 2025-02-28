import { bigint, index, pgTable, text, unique } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";

export const transactionalEmailAddressRegexes = pgTable(
  "mailboxes_transactionalemailaddressregex",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    emailRegex: text().notNull(),
  },
  (table) => {
    return {
      createdAtIdx: index("mailboxes_transactionalemailaddressregex_created_at_76591756").on(
        table.createdAt.asc().nullsLast(),
      ),
      emailRegexUnique: unique("mailboxes_transactionalemailaddressregex_regex_key").on(table.emailRegex),
    };
  },
);
