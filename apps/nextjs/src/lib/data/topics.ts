import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationsTopics, topics } from "@/db/schema";

export const getMailboxTopics = async (mailboxId: number) => {
  const result = await db
    .select({
      id: topics.id,
      name: topics.name,
      count: sql<number>`count(${conversationsTopics.id})`.as("count"),
    })
    .from(topics)
    .leftJoin(
      conversationsTopics,
      and(eq(topics.id, conversationsTopics.topicId), eq(conversationsTopics.mailboxId, mailboxId)),
    )
    .where(eq(topics.mailboxId, mailboxId))
    .groupBy(topics.id, topics.name);

  return result;
};
