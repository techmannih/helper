import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { transactionalEmailAddressRegexes } from "@/db/schema";

export const transactionalEmailAddressRegexesFactory = {
  create: async (overrides: Partial<typeof transactionalEmailAddressRegexes.$inferInsert> = {}) => {
    const transactionalEmailAddressRegex = await db
      .insert(transactionalEmailAddressRegexes)
      .values({
        emailRegex: "noreply@.*",
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);

    return { transactionalEmailAddressRegex };
  },
};
