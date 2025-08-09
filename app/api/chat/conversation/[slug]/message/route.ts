import { and, eq } from "drizzle-orm";
import { createMessageBodySchema } from "@helperai/client";
import { getCustomerFilter } from "@/app/api/chat/customerFilter";
import { corsOptions, corsResponse, withWidgetAuth } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { triggerEvent } from "@/jobs/trigger";
import { createUserMessage } from "@/lib/ai/chat";
import { validateAttachments } from "@/lib/shared/attachmentValidation";
import { cacheClientTools } from "@/lib/data/clientTools";

export const maxDuration = 60;

export const OPTIONS = () => corsOptions("POST");

export const POST = withWidgetAuth<{ slug: string }>(async ({ request, context: { params } }, { session }) => {
  const { slug } = await params;
  const { content, attachments = [], tools, customerSpecificTools } =
    createMessageBodySchema.parse(await request.json());

  if (!content || content.trim().length === 0) {
    return corsResponse({ error: "Content is required" }, { status: 400 });
  }

  const customerFilter = getCustomerFilter(session);
  if (!customerFilter) return corsResponse({ error: "Not authorized - Invalid session" }, { status: 401 });

  const conversation = await db.query.conversations.findFirst({
    where: and(eq(conversations.slug, slug), customerFilter),
  });
  if (!conversation) {
    return corsResponse({ error: "Conversation not found" }, { status: 404 });
  }

  const userEmail = session.isAnonymous ? null : session.email || null;

  const validationResult = validateAttachments(
    attachments.map((att) => ({
      name: att.name || "unknown",
      url: att.url,
      type: att.contentType,
    })),
  );

  if (!validationResult.isValid) {
    return corsResponse({ error: validationResult.errors.join(", ") }, { status: 400 });
  }

  const attachmentData = [];
  for (const attachment of attachments) {
    if (!attachment.url) {
      return corsResponse({ error: `Attachment ${attachment.name || "unknown"} is missing URL` }, { status: 400 });
    }

    const base64Data = attachment.url.split(",")[1];
    if (!base64Data) {
      return corsResponse(
        { error: `Attachment ${attachment.name || "unknown"} has invalid URL format` },
        { status: 400 },
      );
    }

    attachmentData.push({
      name: attachment.name || "unknown.png",
      contentType: attachment.contentType || "image/png",
      data: base64Data,
    });
  }

  const userMessage = await createUserMessage(conversation.id, userEmail, content, attachmentData);

  await cacheClientTools(
    tools,
    customerSpecificTools ? conversation.emailFrom ?? userEmail ?? null : null,
  );

  await triggerEvent(
    "conversations/auto-response.create",
    { messageId: userMessage.id, tools },
    { sleepSeconds: 5 * 60 },
  );

  return corsResponse({
    messageId: userMessage.id,
    conversationSlug: conversation.slug,
  });
});
