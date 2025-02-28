import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { WorkflowConditionField, WorkflowConditionOperator, workflowConditions } from "@/db/schema";

export const workflowConditionFactory = {
  create: async (workflowConditionGroupId: number, overrides: Partial<typeof workflowConditions.$inferInsert> = {}) => {
    const workflowCondition = await db
      .insert(workflowConditions)
      .values({
        workflowConditionGroupId,
        field: WorkflowConditionField.FULL_EMAIL_CONTEXT,
        operator: WorkflowConditionOperator.PASSES_AI_CONDITIONAL_FOR,
        value: faker.lorem.sentence(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);
    return { workflowCondition };
  },
};
