import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { workflowConditionGroups } from "@/db/schema";

export const workflowConditionGroupFactory = {
  create: async (workflowId: number, overrides: Partial<typeof workflowConditionGroups.$inferInsert> = {}) => {
    const workflowConditionGroup = await db
      .insert(workflowConditionGroups)
      .values({
        workflowId,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);
    return { workflowConditionGroup };
  },
};
