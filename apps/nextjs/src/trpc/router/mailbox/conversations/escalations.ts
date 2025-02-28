import { currentUser } from "@clerk/nextjs/server";
import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversations, escalations } from "@/db/schema";
import { createEscalation, getActiveEscalation } from "@/lib/data/escalation";
import { getSlackPermalink } from "@/lib/slack/client";
import { mailboxProcedure } from "../../mailbox/procedure";
import { conversationProcedure } from "./procedure";

export const escalationsRouter = {
  get: conversationProcedure.query(async ({ ctx }) => {
    const { conversation, mailbox } = ctx;
    const escalation = await getActiveEscalation(conversation.id);
    return escalation
      ? {
          slackUrl:
            mailbox.slackBotToken && escalation.slackChannel && escalation.slackMessageTs
              ? await getSlackPermalink(mailbox.slackBotToken, escalation.slackChannel, escalation.slackMessageTs)
              : null,
          isProcessing: !escalation.resolvedAt && !escalation.slackMessageTs,
        }
      : null;
  }),

  create: conversationProcedure.mutation(async ({ ctx }) => {
    const { conversation, mailbox, session } = ctx;

    const user = assertDefined(await currentUser());
    const escalation = await createEscalation(conversation, mailbox, user);
    if ("error" in escalation) throw new TRPCError({ code: "BAD_REQUEST", message: escalation.error });
  }),

  count: mailboxProcedure
    .input(
      z.object({
        startDate: z.date(),
        period: z.enum(["hourly", "daily", "monthly"]),
      }),
    )
    .query(async ({ input, ctx }) => {
      const groupByFormat = (() => {
        switch (input.period) {
          case "hourly":
            return "YYYY-MM-DD HH24:00:00";
          case "daily":
            return "YYYY-MM-DD";
          case "monthly":
            return "YYYY-MM";
        }
      })();

      const data = await db
        .select({
          timePeriod: sql<string>`to_char(${escalations.createdAt}, ${groupByFormat}) AS period`,
          pending: sql<boolean>`(${escalations.resolvedAt} IS NULL) AS pending`,
          count: sql<number | string>`count(*)`,
        })
        .from(escalations)
        .innerJoin(conversations, eq(conversations.id, escalations.conversationId))
        .where(and(gte(escalations.createdAt, input.startDate), eq(conversations.mailboxId, ctx.mailbox.id)))
        .groupBy(sql`period`, sql`pending`);

      return data.map(({ count, ...rest }) => ({
        ...rest,
        count: Number(count),
      }));
    }),
} satisfies TRPCRouterRecord;
