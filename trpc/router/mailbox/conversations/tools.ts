import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { startCase } from "lodash-es";
import { z } from "zod";
import { db } from "@/db/client";
import { tools } from "@/db/schema/tools";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { callToolApi, ToolApiError } from "@/lib/tools/apiTool";
import { createHmacDigest } from "@/lib/metadataApiClient";
import { getCachedTools } from "@/lib/data/cachedTools";
import { conversationProcedure } from "./procedure";

export const toolsRouter = {
  list: conversationProcedure.query(async ({ ctx }) => {
    const { conversation } = ctx;

    const toolsRecord = await getCachedTools(conversation.unused_mailboxId, conversation.emailFrom);
    const suggested = (conversation.suggestedActions ?? []).map((action) => {
      switch (action.type) {
        case "close":
          return { type: "close" as const };
        case "spam":
          return { type: "spam" as const };
        case "assign":
          return { type: "assign" as const, userId: action.userId };
        case "tool":
          const { slug, parameters } = action;
          const tool = toolsRecord[slug];
          if (!tool) {
            throw new Error(`Tool not found: ${slug}`);
          }
          return {
            type: "tool" as const,
            tool: {
              name: slug,
              slug,
              description: tool.description ?? "",
              parameters,
            },
          };
      }
    });

    return {
      suggested,
      all: Object.entries(toolsRecord).map(([slug, tool]) => ({
        name: startCase(slug),
        slug,
        description: tool.description ?? "",
        parameterTypes: Object.entries(tool.parameters ?? {}).map(([name, value]) => ({
          name,
          type: value.type,
          description: value.description,
          required: !value.optional,
        })),
        customerEmailParameter: undefined,
      })),
    };
  }),

  run: conversationProcedure
    .input(
      z.object({
        tool: z.string(),
        params: z.record(z.any()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { tool: toolSlug, params } = input;
      const conversation = ctx.conversation;

      const tool = await db.query.tools.findFirst({
        where: and(eq(tools.slug, toolSlug), eq(tools.enabled, true)),
      });

      if (tool) {
        try {
          return await callToolApi(conversation, tool, params);
        } catch (error) {
          if (error instanceof ToolApiError) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: error.message,
            });
          }

          captureExceptionAndLog(error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Error executing tool",
          });
        }
      }

      const cached = await getCachedTools(conversation.unused_mailboxId, conversation.emailFrom);
      const cachedTool = cached[toolSlug];
      if (!cachedTool || !cachedTool.serverRequestUrl) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      try {
        const requestBody = {
          email: conversation.emailFrom,
          parameters: params,
          requestTimestamp: Math.floor(Date.now() / 1000),
        };
        const hmacDigest = createHmacDigest(ctx.mailbox.widgetHMACSecret, { json: requestBody });
        const hmacSignature = hmacDigest.toString("base64");

        const response = await fetch(cachedTool.serverRequestUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${hmacSignature}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Server returned ${response.status}` });
        }

        return await response.json();
      } catch (error) {
        captureExceptionAndLog(error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error executing tool" });
      }
    }),
};
