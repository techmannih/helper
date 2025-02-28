import { faker } from "@faker-js/faker";
import { db } from "@/db/client";
import { workflowActions } from "@/db/schema";

export const workflowActionFactory = {
  create: async (workflowId: number, overrides: Partial<typeof workflowActions.$inferInsert> = {}) => {
    const [action] = await db
      .insert(workflowActions)
      .values({
        workflowId,
        actionType: "send_auto_reply_from_metadata",
        actionValue: faker.string.uuid(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      })
      .returning();

    if (!action) {
      throw new Error("Workflow action not created");
    }

    return action;
  },
};
