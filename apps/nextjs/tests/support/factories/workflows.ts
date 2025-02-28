import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { workflows } from "@/db/schema";
import { workflowConditionGroupFactory } from "./workflowConditionGroups";
import { workflowConditionFactory } from "./workflowConditions";

export const workflowFactory = {
  create: async (mailboxId: number, overrides: Partial<typeof workflows.$inferInsert> = {}) => {
    const workflow = await db
      .insert(workflows)
      .values({
        mailboxId,
        name: faker.lorem.words(3),
        description: faker.lorem.sentence(),
        order: faker.number.int({ min: 0, max: 100 }),
        workflowType: "default",
        runOnReplies: false,
        autoReplyFromMetadata: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);

    const { workflowConditionGroup } = await workflowConditionGroupFactory.create(workflow.id);
    await workflowConditionFactory.create(workflowConditionGroup.id);
    return workflow;
  },
};
