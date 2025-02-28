import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { faqs } from "@/db/schema";

export const faqsFactory = {
  create: async (mailboxId: number, overrides: Partial<typeof faqs.$inferInsert> = {}) => {
    const defaultValues = {
      question: faker.lorem.sentence(),
      body: faker.lorem.paragraph(),
      reply: faker.lorem.paragraph(),
      mailboxId,
    };

    const values = { ...defaultValues, ...overrides };
    const faq = await db.insert(faqs).values(values).returning().then(takeUniqueOrThrow);

    return { faq };
  },
};
