import { relations } from "drizzle-orm";
import { bigint, index, jsonb, pgTable } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { conversationMessages } from "./conversationMessages";
import { conversations } from "./conversations";
import { mailboxes } from "./mailboxes";
import { workflowConditions } from "./workflowConditions";
import { workflowRunActions } from "./workflowRunActions";
import { workflows } from "./workflows";

export const workflowRuns = pgTable(
  "workflows_workflowrun",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    workflowInfo: jsonb()
      .$type<{
        name: string;
        order: number;
        description: string;
        workflow_type: string;
        run_on_replies: boolean;
        // Not all records will have this field since it was added later
        auto_reply_from_metadata?: boolean;
      }>()
      .notNull(),
    workflowConditions: jsonb()
      .$type<{ workflow_conditions: Partial<typeof workflowConditions.$inferSelect>[] }[]>()
      .notNull(),
    conversationId: bigint({ mode: "number" }).notNull(),
    messageId: bigint("message_id", { mode: "number" }).notNull(),
    mailboxId: bigint({ mode: "number" }).notNull(),
    workflowId: bigint({ mode: "number" }).notNull(),
  },
  (table) => {
    return {
      conversationIdIdx: index("workflows_workflowrun_conversation_id_2c4060e5").on(table.conversationId),
      createdAtIdx: index("workflows_workflowrun_created_at_071c8616").on(table.createdAt),
      messageIdIdx: index("workflows_workflowrun_message_id_idx").on(table.messageId),
      mailboxIdIdx: index("workflows_workflowrun_mailbox_id_f4c91218").on(table.mailboxId),
      workflowIdIdx: index("workflows_workflowrun_workflow_id_51c8c945").on(table.workflowId),
    };
  },
);

export const workflowRunsRelations = relations(workflowRuns, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [workflowRuns.conversationId],
    references: [conversations.id],
  }),
  message: one(conversationMessages, {
    fields: [workflowRuns.messageId],
    references: [conversationMessages.id],
  }),
  mailbox: one(mailboxes, {
    fields: [workflowRuns.mailboxId],
    references: [mailboxes.id],
  }),
  workflow: one(workflows, {
    fields: [workflowRuns.workflowId],
    references: [workflows.id],
  }),
  workflowRunActions: many(workflowRunActions),
}));
