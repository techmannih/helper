import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { workflowRuns } from "./workflowRuns";

export const workflowRunActions = pgTable(
  "workflows_workflowrunaction",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    actionType: text().notNull(),
    actionValue: text().notNull(),
    workflowRunId: bigint({ mode: "number" }).notNull(),
  },
  (table) => {
    return {
      createdAtIdx: index("workflows_workflowrunaction_created_at_630b1ff6").on(table.createdAt),
      workflowRunIdIdx: index("workflows_workflowrunaction_workflow_run_id_11bd0888").on(table.workflowRunId),
    };
  },
);

export const workflowRunActionsRelations = relations(workflowRunActions, ({ one }) => ({
  workflowRun: one(workflowRuns, {
    fields: [workflowRunActions.workflowRunId],
    references: [workflowRuns.id],
  }),
}));
