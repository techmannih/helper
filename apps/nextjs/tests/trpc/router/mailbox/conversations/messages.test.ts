import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { conversationMessages, faqs } from "@/db/schema";
import { createCaller } from "@/trpc";

vi.mock("@/lib/data/conversationMessage", () => ({
  createReply: vi.fn().mockResolvedValue(123),
}));

describe("messagesRouter", () => {
  describe("update", () => {
    it("updates a message", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();

      const { conversation } = await conversationFactory.create(mailbox.id);
      const userEmail1 = await conversationFactory.createUserEmail(conversation.id);
      const staffEmail1 = await conversationFactory.createStaffEmail(conversation.id, user.id);
      const userEmail2 = await conversationFactory.createUserEmail(conversation.id);
      const staffEmail2 = await conversationFactory.createStaffEmail(conversation.id, user.id);

      const caller = createCaller(createTestTRPCContext(user, organization));
      await caller.mailbox.conversations.messages.setPinned({
        mailboxSlug: mailbox.slug,
        conversationSlug: conversation.slug,
        id: staffEmail2.id,
        isPinned: true,
      });

      const updatedMessage = await db.query.conversationMessages.findFirst({
        where: eq(conversationMessages.id, staffEmail2.id),
      });
      expect(updatedMessage?.isPinned).toBe(true);

      const faq = await db.query.faqs.findFirst({
        where: eq(faqs.messageId, staffEmail2.id),
      });
      expect(faq).toMatchObject({
        mailboxId: mailbox.id,
        messageId: staffEmail2.id,
        question: conversation.subject,
        body: `Question: ${userEmail1.body}\nAnswer: ${staffEmail1.body}\nQuestion: ${userEmail2.body}`,
        reply: staffEmail2.body,
      });
    });
  });

  describe("flagAsBad", () => {
    it("flags an AI message as bad", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
      const userMessage = await conversationFactory.createUserEmail(conversation.id);
      const { message: aiMessage } = await conversationMessagesFactory.createDraft(conversation.id, userMessage.id);

      const caller = createCaller(createTestTRPCContext(user, organization));
      await caller.mailbox.conversations.messages.flagAsBad({
        mailboxSlug: mailbox.slug,
        conversationSlug: conversation.slug,
        id: aiMessage.id,
        reason: "Incorrect information",
      });

      const updatedMessage = await db.query.conversationMessages.findFirst({
        where: and(
          eq(conversationMessages.id, aiMessage.id),
          eq(conversationMessages.conversationId, conversation.id),
          isNull(conversationMessages.deletedAt),
        ),
      });

      expect(updatedMessage?.isFlaggedAsBad).toBe(true);
      expect(updatedMessage?.reason).toBe("Incorrect information");
    });

    it("throws an error when trying to flag a non-existent message", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);

      const caller = createCaller(createTestTRPCContext(user, organization));

      await expect(
        caller.mailbox.conversations.messages.flagAsBad({
          mailboxSlug: mailbox.slug,
          conversationSlug: conversation.slug,
          id: 999999, // Non-existent message ID
          reason: "This message doesn't exist",
        }),
      ).rejects.toThrow("Message not found or not part of this conversation");
    });

    it("throws an error when trying to flag a user message", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
      const userMessage = await conversationFactory.createUserEmail(conversation.id);

      const caller = createCaller(createTestTRPCContext(user, organization));

      await expect(
        caller.mailbox.conversations.messages.flagAsBad({
          mailboxSlug: mailbox.slug,
          conversationSlug: conversation.slug,
          id: userMessage.id,
          reason: "This is a user message",
        }),
      ).rejects.toThrow("Message not found or not part of this conversation");
    });
  });
});
