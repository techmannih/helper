import * as Sentry from "@sentry/nextjs";
import { waitUntil } from "@vercel/functions";
import { type Message } from "ai";
import { eq } from "drizzle-orm";
import { ReadPageToolConfig } from "@helperai/sdk";
import { corsOptions, corsResponse, withWidgetAuth } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { createUserMessage, respondWithAI } from "@/lib/ai/chat";
import {
  CHAT_CONVERSATION_SUBJECT,
  generateConversationSubject,
  getConversationBySlugAndMailbox,
} from "@/lib/data/conversation";
import { publicConversationChannelId } from "@/lib/realtime/channels";
import { publishToRealtime } from "@/lib/realtime/publish";
import { validateAttachments } from "@/lib/shared/attachmentValidation";
import { createClient } from "@/lib/supabase/server";
import { WidgetSessionPayload } from "@/lib/widgetSession";
import { ToolRequestBody } from "@helperai/client";
import { cacheClientTools } from "@/lib/data/clientTools";

export const maxDuration = 60;

interface ChatRequestBody {
  message: Message;
  token: string;
  conversationSlug: string;
  readPageTool: ReadPageToolConfig | null;
  guideEnabled: boolean;
  isToolResult?: boolean;
  tools?: Record<string, ToolRequestBody>;
  customerSpecificTools?: boolean;
}

const getConversation = async (conversationSlug: string, session: WidgetSessionPayload) => {
  const conversation = await getConversationBySlugAndMailbox(conversationSlug);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // For anonymous sessions, only allow access if the conversation has no emailFrom
  // For authenticated sessions, only allow access if the emailFrom matches
  const isAnonymousUnauthorized = session.isAnonymous && conversation.emailFrom !== null;
  const isAuthenticatedUnauthorized = session.email && conversation.emailFrom !== session.email;

  if (isAnonymousUnauthorized || isAuthenticatedUnauthorized) {
    throw new Error("Unauthorized");
  }

  return conversation;
};

export const OPTIONS = () => corsOptions("POST");

export const POST = withWidgetAuth(async ({ request }, { session, mailbox }) => {
  const {
    message,
    conversationSlug,
    readPageTool,
    guideEnabled,
    tools,
    customerSpecificTools,
  }: ChatRequestBody = await request.json();

  Sentry.setTag("conversation_slug", conversationSlug);

  const conversation = await getConversation(conversationSlug, session);

  const userEmail = session.isAnonymous ? null : session.email || null;
  const attachments = message.experimental_attachments ?? [];

  await cacheClientTools(tools, customerSpecificTools ? conversation.emailFrom ?? userEmail ?? null : null);

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

  const attachmentData = attachments.map((attachment) => {
    if (!attachment.url) {
      throw new Error(`Attachment ${attachment.name || "unknown"} is missing URL`);
    }

    const [, base64Data] = attachment.url.split(",");
    if (!base64Data) {
      throw new Error(`Attachment ${attachment.name || "unknown"} has invalid URL format`);
    }

    return {
      name: attachment.name || "unknown.png",
      contentType: attachment.contentType || "image/png",
      data: base64Data,
    };
  });

  const userMessage = await createUserMessage(
    conversation.id,
    userEmail,
    message.content || (attachmentData.length > 0 ? "[Image]" : ""),
    attachmentData,
  );

  const supabase = await createClient();
  let isHelperUser = false;
  if ((await supabase.auth.getUser()).data.user?.id) {
    isHelperUser = true;
  }

  return await respondWithAI({
    conversation,
    mailbox,
    userEmail,
    message,
    messageId: userMessage.id,
    readPageTool,
    guideEnabled,
    sendEmail: false,
    reasoningEnabled: false,
    isHelperUser,
    tools,
    onResponse: ({ messages, isPromptConversation, isFirstMessage, humanSupportRequested }) => {
      if (
        (!isPromptConversation && conversation.subject === CHAT_CONVERSATION_SUBJECT) ||
        (isPromptConversation && !isFirstMessage && conversation.subject === messages[0]?.content) ||
        humanSupportRequested
      ) {
        waitUntil(
          generateConversationSubject(conversation.id, messages, mailbox).then((subject) =>
            publishToRealtime({
              channel: publicConversationChannelId(conversation.slug),
              event: "conversation-subject",
              data: { subject },
            }),
          ),
        );
      } else if (isPromptConversation && conversation.subject === CHAT_CONVERSATION_SUBJECT) {
        waitUntil(
          db
            .update(conversations)
            .set({ subject: message.content, subjectPlaintext: message.content })
            .where(eq(conversations.id, conversation.id)),
        );
      }
    },
  });
});
