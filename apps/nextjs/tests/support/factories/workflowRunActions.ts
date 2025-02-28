import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { workflowRunActions } from "@/db/schema";

export const workflowRunActionFactory = {
  create: async (workflowRunId: number, overrides: Partial<typeof workflowRunActions.$inferInsert> = {}) => {
    const action = await db
      .insert(workflowRunActions)
      .values({
        workflowRunId,
        actionType: "add_category",
        actionValue: faker.string.uuid(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);

    return { action };
  },
};
