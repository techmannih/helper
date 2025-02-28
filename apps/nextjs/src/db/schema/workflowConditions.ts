import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text } from "drizzle-orm/pg-core";
import { withTimestamps } from "@/db/lib/with-timestamps";
import { workflowConditionGroups } from "./workflowConditionGroups";

export const WorkflowConditionField = {
  STATUS: "status",
  SUBJECT: "subject",
  EMAIL: "email",
  QUESTION: "question",
  CC: "cc",
  FULL_EMAIL_CONTEXT: "full_email_context",
} as const;

export type WorkflowConditionFieldType = (typeof WorkflowConditionField)[keyof typeof WorkflowConditionField];

export const WorkflowConditionOperator = {
  CONTAINS: "contains",
  DOESNT_CONTAIN: "doesn't contain",
  IS_EQUAL_TO: "is equal to",
  IS_NOT_EQUAL_TO: "is not equal to",
  STARTS_WITH: "starts with",
  ENDS_WITH: "ends with",
  PASSES_AI_CONDITIONAL_FOR: "passes AI conditional for",
} as const;

export type WorkflowConditionOperatorType = (typeof WorkflowConditionOperator)[keyof typeof WorkflowConditionOperator];

export const workflowConditions = pgTable(
  "workflows_workflowcondition",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    field: text().notNull().$type<WorkflowConditionFieldType>(),
    operator: text().notNull().$type<WorkflowConditionOperatorType>(),
    value: text().notNull(),
    workflowConditionGroupId: bigint({ mode: "number" }).notNull(),
  },
  (table) => {
    return {
      workflowConditionGroupIdIdx: index("workflows_workflowconditio_workflow_condition_group_i_3ef7928b").on(
        table.workflowConditionGroupId,
      ),
      createdAtIdx: index("workflows_workflowcondition_created_at_c803fb7f").on(table.createdAt),
    };
  },
);

export const workflowConditionsRelations = relations(workflowConditions, ({ one }) => ({
  workflowConditionGroup: one(workflowConditionGroups, {
    fields: [workflowConditions.workflowConditionGroupId],
    references: [workflowConditionGroups.id],
  }),
}));
