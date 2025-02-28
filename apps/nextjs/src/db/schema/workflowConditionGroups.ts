import { relations } from "drizzle-orm";
import { bigint, index, pgTable } from "drizzle-orm/pg-core";
import { withTimestamps } from "@/db/lib/with-timestamps";
import { workflows } from "@/db/schema/workflows";
import { workflowConditions } from "./workflowConditions";

export const workflowConditionGroups = pgTable(
  "workflows_workflowconditiongroup",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    workflowId: bigint({ mode: "number" }).notNull(),
  },
  (table) => {
    return {
      createdAtIdx: index("workflows_workflowconditiongroup_created_at_420e78cf").on(table.createdAt),
      workflowIdIdx: index("workflows_workflowconditiongroup_workflow_id_69ab4c7d").on(table.workflowId),
    };
  },
);

export const workflowConditionGroupsRelations = relations(workflowConditionGroups, ({ one, many }) => ({
  // Short relation name to avoid Postgres max identifier length
  // https://github.com/drizzle-team/drizzle-orm/issues/2066
  conds: many(workflowConditions),
  workflow: one(workflows, {
    fields: [workflowConditionGroups.workflowId],
    references: [workflows.id],
  }),
}));
