import { relations } from "drizzle-orm";
import { bigint, boolean, customType, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { mailboxes } from "./mailboxes";
import { workflowActions } from "./workflowActions";
import { workflowConditionGroups } from "./workflowConditionGroups";

const workflowTypeType = customType<{ data: "default" | "freeform" }>({
  dataType: () => "text",
});

export const workflows = pgTable(
  "workflows_workflow",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().notNull().generatedByDefaultAsIdentity(),
    name: text().notNull(),
    description: text().notNull(),
    order: integer().notNull(),
    mailboxId: bigint({ mode: "number" }).notNull(),
    workflowType: workflowTypeType().notNull(),
    runOnReplies: boolean().notNull(),
    deletedAt: timestamp({ withTimezone: true }),
    autoReplyFromMetadata: boolean().notNull(),
  },
  (table) => {
    return {
      createdAtIdx: index("workflows_workflow_created_at_d46aca0c").on(table.createdAt),
      mailboxIdIdx: index("workflows_workflow_mailbox_id_ef751436").on(table.mailboxId),
    };
  },
);

export const workflowsRelations = relations(workflows, ({ many, one }) => ({
  mailbox: one(mailboxes, {
    fields: [workflows.mailboxId],
    references: [mailboxes.id],
  }),
  workflowActions: many(workflowActions),
  // Short relation name to avoid Postgres max identifier length
  // https://github.com/drizzle-team/drizzle-orm/issues/2066
  groups: many(workflowConditionGroups),
}));
