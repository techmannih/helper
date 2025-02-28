import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { WorkflowConditionField, WorkflowConditionOperator, workflowRuns } from "@/db/schema";

export const workflowRunFactory = {
  create: async (
    workflowId: number,
    conversationId: number,
    messageId: number,
    mailboxId: number,
    overrides: Partial<typeof workflowRuns.$inferInsert> = {},
  ) => {
    const workflowRun = await db
      .insert(workflowRuns)
      .values({
        workflowId,
        conversationId,
        messageId,
        mailboxId,
        workflowInfo: {
          name: faker.lorem.words(3),
          order: faker.number.int({ min: 0, max: 100 }),
          description: faker.lorem.sentence(),
          workflow_type: "freeform",
          run_on_replies: faker.datatype.boolean(),
          auto_reply_from_metadata: faker.datatype.boolean(),
        },
        workflowConditions: [
          {
            workflow_conditions: [
              {
                field: WorkflowConditionField.FULL_EMAIL_CONTEXT,
                operator: WorkflowConditionOperator.PASSES_AI_CONDITIONAL_FOR,
                value: "test prompt",
              },
            ],
          },
        ],
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);

    return { workflowRun };
  },
};
