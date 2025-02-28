import { sql } from "drizzle-orm";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { transactionalEmailAddressRegexes } from "@/db/schema/transactionalEmailAddressRegexes";

export const matchesTransactionalEmailAddress = async (email: string) => {
  const rawResult = await db
    .execute(sql`SELECT EXISTS (SELECT 1 FROM ${transactionalEmailAddressRegexes} WHERE ${email} ~ email_regex)`)
    .then(takeUniqueOrThrow);

  const { exists } = z
    .object({
      exists: z.boolean(),
    })
    .parse(rawResult);
  return exists;
};
