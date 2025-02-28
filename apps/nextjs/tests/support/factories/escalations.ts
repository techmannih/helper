import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { escalations } from "@/db/schema";

export const escalationFactory = {
  create: async (conversationId: number, overrides: Partial<typeof escalations.$inferInsert> = {}) => {
    const escalation = await db
      .insert(escalations)
      .values({
        conversationId,
        slackMessageTs: faker.string.alphanumeric(16),
        slackChannel: faker.string.alphanumeric(10),
        summary: faker.lorem.paragraph(),
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);

    return { escalation };
  },
};
