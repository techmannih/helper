import { TRPCRouterRecord } from "@trpc/server";
import { waitUntil } from "@vercel/functions";
import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversations, conversationsTopics, topics } from "@/db/schema";
import { runAIObjectQuery } from "@/lib/ai";
import { redis } from "@/lib/redis/client";
import { mailboxProcedure } from "./procedure";

const CACHE_TTL = 24 * 60 * 60; // 24 hours

type Trend = {
  previousCount: number;
  percentageChange: number;
  direction: "up" | "down" | "neutral";
};

export const topicsRouter = {
  all: mailboxProcedure.query(async ({ ctx }) => {
    return await db.query.topics.findMany({
      columns: {
        id: true,
        name: true,
        parentId: true,
      },
      where: eq(topics.mailboxId, ctx.mailbox.id),
      orderBy: [topics.parentId, topics.name],
    });
  }),
  list: mailboxProcedure
    .input(
      z.object({
        timeRange: z.enum(["24h", "7d", "30d", "1y"]).default("7d"),
        customDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const periodDurations = {
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
        "1y": 365 * 24 * 60 * 60 * 1000,
      };

      const currentPeriodStart = input.customDate || new Date(now.getTime() - periodDurations[input.timeRange]);
      const previousPeriodStart = new Date(now.getTime() - 2 * periodDurations[input.timeRange]);

      const timeFilter = currentPeriodStart
        ? and(gte(conversationsTopics.createdAt, currentPeriodStart), lt(conversationsTopics.createdAt, now))
        : undefined;

      const previousTimeFilter =
        previousPeriodStart && currentPeriodStart
          ? and(
              gte(conversationsTopics.createdAt, previousPeriodStart),
              lt(conversationsTopics.createdAt, currentPeriodStart),
            )
          : undefined;

      // Current period query
      const currentResult = await db
        .select({
          id: topics.id,
          name: topics.name,
          count: sql<number>`count(${conversationsTopics.id})`.as("count"),
        })
        .from(topics)
        .leftJoin(
          conversationsTopics,
          and(
            eq(topics.id, conversationsTopics.topicId),
            eq(conversationsTopics.mailboxId, ctx.mailbox.id),
            ...(timeFilter ? [timeFilter] : []),
          ),
        )
        .where(and(eq(topics.mailboxId, ctx.mailbox.id), isNull(topics.parentId)))
        .groupBy(topics.id, topics.name);

      // Previous period query
      const previousResult = await db
        .select({
          id: topics.id,
          count: sql<number>`count(${conversationsTopics.id})`.as("count"),
        })
        .from(topics)
        .leftJoin(
          conversationsTopics,
          and(
            eq(topics.id, conversationsTopics.topicId),
            eq(conversationsTopics.mailboxId, ctx.mailbox.id),
            previousTimeFilter,
          ),
        )
        .where(and(eq(topics.mailboxId, ctx.mailbox.id), isNull(topics.parentId)))
        .groupBy(topics.id);

      // Combine results with trend data
      return currentResult.map((topic) => {
        const previousCount = previousResult.find((p) => p.id === topic.id)?.count ?? 0;
        const percentageChange =
          previousCount === 0 ? (topic.count === 0 ? 0 : 100) : ((topic.count - previousCount) / previousCount) * 100;

        return {
          ...topic,
          trend: {
            previousCount,
            percentageChange,
            direction: percentageChange > 0 ? "up" : percentageChange < 0 ? "down" : "neutral",
          } satisfies Trend,
        };
      });
    }),

  getDetails: mailboxProcedure
    .input(
      z.object({
        topicId: z.number(),
        timeRange: z.enum(["24h", "7d", "30d", "1y"]).default("7d"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const periodDurations = {
        "24h": 24 * 60 * 60 * 1000,
        "7d": 7 * 24 * 60 * 60 * 1000,
        "30d": 30 * 24 * 60 * 60 * 1000,
        "1y": 365 * 24 * 60 * 60 * 1000,
      };

      const periodStart = new Date(now.getTime() - periodDurations[input.timeRange]);
      const previousPeriodStart = new Date(now.getTime() - 2 * periodDurations[input.timeRange]);

      const timeFilter = periodStart
        ? and(gte(conversationsTopics.createdAt, periodStart), lt(conversationsTopics.createdAt, now))
        : undefined;

      const previousTimeFilter =
        previousPeriodStart && periodStart
          ? and(gte(conversationsTopics.createdAt, previousPeriodStart), lt(conversationsTopics.createdAt, periodStart))
          : undefined;

      // Get subtopics with counts for current period
      const currentSubtopics = await db
        .select({
          id: topics.id,
          name: topics.name,
          count: sql<number>`count(distinct ${conversationsTopics.conversationId})`.as("count"),
        })
        .from(topics)
        .leftJoin(
          conversationsTopics,
          and(
            eq(topics.id, conversationsTopics.subTopicId),
            eq(conversationsTopics.mailboxId, ctx.mailbox.id),
            ...(timeFilter ? [timeFilter] : []),
          ),
        )
        .where(and(eq(topics.mailboxId, ctx.mailbox.id), eq(topics.parentId, input.topicId)))
        .groupBy(topics.id, topics.name)
        .orderBy(sql`count(distinct ${conversationsTopics.conversationId}) desc`);

      // Skip previous period for "1y" time range
      const subtopics =
        input.timeRange === "1y"
          ? currentSubtopics.map((topic) => ({ ...topic, trend: null }))
          : await db
              .select({
                id: topics.id,
                count: sql<number>`count(distinct ${conversationsTopics.conversationId})`.as("count"),
              })
              .from(topics)
              .leftJoin(
                conversationsTopics,
                and(
                  eq(topics.id, conversationsTopics.subTopicId),
                  eq(conversationsTopics.mailboxId, ctx.mailbox.id),
                  previousTimeFilter,
                ),
              )
              .where(and(eq(topics.mailboxId, ctx.mailbox.id), eq(topics.parentId, input.topicId)))
              .groupBy(topics.id)
              .then((previousSubtopics) => {
                return currentSubtopics.map((topic) => {
                  const previousCount = previousSubtopics.find((p) => p.id === topic.id)?.count ?? 0;
                  const percentageChange =
                    previousCount === 0
                      ? topic.count === 0
                        ? 0
                        : 100
                      : ((topic.count - previousCount) / previousCount) * 100;

                  return {
                    ...topic,
                    trend: {
                      previousCount,
                      percentageChange,
                      direction: percentageChange > 0 ? "up" : percentageChange < 0 ? "down" : "neutral",
                    } satisfies Trend,
                  };
                });
              });

      // Get conversation volume over time
      const volumeData = await db
        .select({
          date: sql<string>`date_trunc('day', ${conversationsTopics.createdAt})::text`,
          count: sql<number>`count(distinct ${conversationsTopics.conversationId})`,
        })
        .from(conversationsTopics)
        .where(
          and(
            eq(conversationsTopics.mailboxId, ctx.mailbox.id),
            eq(conversationsTopics.topicId, input.topicId),
            ...(timeFilter ? [timeFilter] : []),
          ),
        )
        .groupBy(sql`date_trunc('day', ${conversationsTopics.createdAt})`)
        .orderBy(sql`date_trunc('day', ${conversationsTopics.createdAt})`);

      return {
        subtopics,
        volumeData,
      };
    }),

  getExampleQuestions: mailboxProcedure
    .input(
      z.object({
        subtopicId: z.number(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const cacheKey = `example-questions:${ctx.mailbox.slug}:${input.subtopicId}:v2`;
      const cached = await redis.get<string[]>(cacheKey);
      if (cached) return cached;

      const subtopic = await assertDefined(
        db.query.topics.findFirst({
          where: eq(topics.id, input.subtopicId),
        }),
      );

      const recentConversations = await db
        .select({
          id: conversations.id,
          summary: conversations.summary,
          embeddingText: conversations.embeddingText,
          subject: conversations.subject,
        })
        .from(conversations)
        .innerJoin(conversationsTopics, eq(conversations.id, conversationsTopics.conversationId))
        .where(
          and(eq(conversationsTopics.mailboxId, ctx.mailbox.id), eq(conversationsTopics.subTopicId, input.subtopicId)),
        )
        .orderBy(sql`RANDOM()`)
        .limit(20);

      const result = await runAIObjectQuery({
        messages: [
          {
            role: "user",
            content: `Example conversations: ${recentConversations
              .map((conv, i) => `${i + 1}. ${conv.subject} ${conv.summary} ${conv.embeddingText}`)
              .join("\n")}`,
          },
        ],
        system: `Based on the following examples of conversations under the subtopic "${subtopic?.name}", generate 3 distinct example questions that customers might ask that would be classified under this subtopic. 
        Make them specific but without any personally identifiable information, they should be general questions that anyone could ask. Be clear and concise, don't generate long questions.`,
        mailbox: ctx.mailbox,
        queryType: "conversation_summary",
        temperature: 0.1,
        schema: z.object({
          questions: z.array(z.string()).length(3),
        }),
      });

      waitUntil(redis.set(cacheKey, result.questions, { ex: CACHE_TTL }));

      return result.questions;
    }),
} satisfies TRPCRouterRecord;
