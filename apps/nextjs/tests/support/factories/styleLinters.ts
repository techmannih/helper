import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { styleLinters } from "@/db/schema";

export const styleLinterFactory = {
  create: async (organizationId: string, overrides: Partial<typeof styleLinters.$inferInsert> = {}) => {
    const linter = await db
      .insert(styleLinters)
      .values({
        before: faker.lorem.sentence(),
        after: faker.lorem.sentence(),
        clerkOrganizationId: organizationId,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);
    return linter;
  },
};
