import { User } from "@clerk/nextjs/server";
import { KnownBlock } from "@slack/web-api";
import { and, eq, isNull } from "drizzle-orm";
import { getBaseUrl } from "@/components/constants";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db, Transaction } from "@/db/client";
import { conversations, escalations, mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { getPlatformCustomer } from "@/lib/data/platformCustomer";
import { postSlackMessage, updateSlackMessage } from "@/lib/slack/client";
import { updateConversation } from "./conversation";
import { createReply } from "./conversationMessage";
import { getClerkUser } from "./user";

type EscalationWithAssociations = typeof escalations.$inferSelect & {
  conversation: typeof conversations.$inferSelect & { mailbox: typeof mailboxes.$inferSelect };
};

export const getActiveEscalation = async (conversationId: number, tx: Transaction | typeof db = db) => {
  const escalation = await tx.query.escalations.findFirst({
    where: and(eq(escalations.conversationId, conversationId), isNull(escalations.resolvedAt)),
    orderBy: (escalations, { desc }) => [desc(escalations.createdAt)],
  });
  return escalation ?? null;
};

export const defaultEmailBody = (mailbox: typeof mailboxes.$inferSelect, asHtml = true): string => {
  const separator = asHtml ? "<br>" : "\n";
  return [
    "Hey there,",
    "Thank you for reporting this issue. Really sorry you ran into this!",
    "We are looking into it now and will get back to you soon about a solution.",
    "Let me know if you need any further help!",
    "",
    "Best,",
    `${mailbox.name} Support`,
  ].join(separator);
};

export const postEscalationMessage = async (escalation: EscalationWithAssociations) => {
  if (!escalation.slackChannel) throw new Error("Escalation is not linked to Slack");
  if (!escalation.conversation.mailbox.slackBotToken) throw new Error("Mailbox is not linked to Slack");

  const slackMessageTs = await postSlackMessage(escalation.conversation.mailbox.slackBotToken, {
    channel: escalation.slackChannel,
    attachments: [
      {
        color: OPEN_ATTACHMENT_COLOR,
        blocks: [
          ...(await commonBlocks(escalation)),
          {
            type: "actions",
            block_id: "escalation_actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "Respond" },
                action_id: "respond_in_slack",
              },
              {
                type: "button",
                text: { type: "plain_text", text: "Assign" },
                action_id: "assign",
              },
              {
                type: "button",
                text: { type: "plain_text", text: "Close" },
                action_id: "close",
              },
            ],
          },
        ],
      },
    ],
  });

  await db.update(escalations).set({ slackMessageTs }).where(eq(escalations.id, escalation.id));
};

export const resolveEscalation = async (
  {
    escalation,
    user,
    email,
    note,
    closed,
    assignedTo,
  }: {
    escalation: typeof escalations.$inferSelect;
    user: User | null;
    email?: boolean;
    note?: boolean;
    closed?: boolean;
    assignedTo?: User;
  },
  tx0: Transaction | typeof db = db,
) => {
  await tx0.transaction(async (tx) => {
    escalation = await tx
      .update(escalations)
      .set({ resolvedAt: new Date() })
      .where(eq(escalations.id, escalation.id))
      .returning()
      .then(takeUniqueOrThrow);

    if (!closed) {
      await updateConversation(
        escalation.conversationId,
        {
          set: { status: "open" },
          byUserId: user?.id ?? null,
          message: "Escalation resolved",
        },
        tx,
      );
    }
  });
  await updateEscalationSlackMessage({ escalation, user, email, note, closed, assignedTo });
};

export const createEscalation = async (
  conversation: typeof conversations.$inferSelect,
  mailbox: typeof mailboxes.$inferSelect,
  user: User | null = null,
) => {
  const activeEscalation = await getActiveEscalation(conversation.id);
  if (activeEscalation) return { error: "Conversation is already escalated" };
  if (!conversation.emailFrom) return { error: "Conversation has no email from" };

  const customer = await getPlatformCustomer(mailbox.id, conversation.emailFrom);
  const escalationMessage = mailbox.escalationEmailBody ?? defaultEmailBody(mailbox);
  const slackChannel = customer?.isVip ? mailbox.vipChannelId : mailbox.slackEscalationChannel;

  const escalation = await db.transaction(async (tx) => {
    await createReply(
      {
        conversationId: conversation.id,
        user,
        message: escalationMessage,
        close: false,
        shouldAutoAssign: false,
      },
      tx,
    );

    await updateConversation(conversation.id, { set: { status: "escalated" }, byUserId: user?.id ?? null }, tx);

    const escalation = await tx
      .insert(escalations)
      .values({
        conversationId: conversation.id,
        clerkUserId: user?.id,
        slackChannel,
      })
      .returning({ id: escalations.id })
      .then(takeUniqueOrThrow);

    return escalation;
  });

  await inngest.send({
    name: "conversations/escalation.created",
    data: {
      escalationId: escalation.id,
    },
  });

  return escalation;
};

const OPEN_ATTACHMENT_COLOR = "#EF4444";
const RESOLVED_ATTACHMENT_COLOR = "#22C55E";

const updateEscalationSlackMessage = async ({
  escalation,
  user: resolvingUser,
  email,
  note,
  closed,
  assignedTo,
}: {
  escalation: typeof escalations.$inferSelect;
  user: User | null;
  email?: boolean;
  note?: boolean;
  closed?: boolean;
  assignedTo?: User;
}) => {
  const { slackChannel, slackMessageTs, conversationId } = escalation;
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    with: { mailbox: true },
  });
  if (!slackChannel || !slackMessageTs || !conversation?.mailbox.slackBotToken) return;

  const byUser = resolvingUser ? ` by ${resolvingUser.fullName}` : "";

  let text = "";
  if (email && closed) {
    text = `Closed with reply${byUser}`;
  } else if (email) {
    text = `Reply sent${byUser}`;
  } else if (note) {
    text = `Note added${byUser}`;
  } else if (closed) {
    text = `Closed${byUser}`;
  } else if (assignedTo) {
    text = `Assigned to ${assignedTo.fullName}${byUser}`;
  }

  const blocks: KnownBlock[] = [
    ...(await commonBlocks({ ...escalation, conversation })),
    {
      type: "context",
      elements: [{ type: "mrkdwn", text }],
    },
  ];

  await updateSlackMessage({
    token: conversation.mailbox.slackBotToken,
    channel: slackChannel,
    ts: slackMessageTs,
    attachments: [{ color: RESOLVED_ATTACHMENT_COLOR, blocks }],
  });
};

const commonBlocks = async (escalation: EscalationWithAssociations): Promise<KnownBlock[]> => {
  const user = await getClerkUser(escalation.clerkUserId);
  const platformCustomer = escalation.conversation.emailFrom
    ? await getPlatformCustomer(escalation.conversation.mailboxId, escalation.conversation.emailFrom)
    : null;

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `_Message from ${escalation.conversation.emailFrom} marked as *Escalated* by ${user?.fullName ?? "Helper"}_`,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: escalation.conversation.summary?.length
          ? `*Summary:*\n${escalation.conversation.summary.map((point) => `• ${point}`).join("\n")}`
          : "*Summary:* No summary available",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `<${getBaseUrl()}/mailboxes/${escalation.conversation.mailbox.slug}/conversations?id=${escalation.conversation.slug}|View in Helper>`,
          ...(platformCustomer
            ? Object.entries(platformCustomer.links ?? {}).map(([key, value]) => `<${value}|${key}>`)
            : []),
        ].join(" · "),
      },
    },
  ];
};
