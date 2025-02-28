import { conversationFactory } from "@tests/support/factories/conversations";
import { escalationFactory } from "@tests/support/factories/escalations";
import { userFactory } from "@tests/support/factories/users";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { escalations } from "@/db/schema";
import { addNote } from "@/lib/data/note";

describe("addNote", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a note for a conversation", async () => {
    const { user, mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);

    const note = await addNote({
      conversationId: conversation.id,
      message: "Test note",
      user,
      slackChannel: "C123456",
      slackMessageTs: "1234567890.123456",
    });

    expect(note).toEqual(
      expect.objectContaining({
        conversationId: conversation.id,
        body: "Test note",
        clerkUserId: user.id,
        role: "staff",
        slackChannel: "C123456",
        slackMessageTs: "1234567890.123456",
      }),
    );
  });

  it("creates a note without a user", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);

    const note = await addNote({
      conversationId: conversation.id,
      message: "Anonymous note",
      user: null,
    });

    expect(note).toEqual(
      expect.objectContaining({
        conversationId: conversation.id,
        body: "Anonymous note",
        clerkUserId: null,
        role: "staff",
        slackChannel: null,
        slackMessageTs: null,
      }),
    );
  });

  it("resolves an active escalation when adding a note", async () => {
    const { user, mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { escalation } = await escalationFactory.create(conversation.id);

    await addNote({
      conversationId: conversation.id,
      message: "Resolving escalation",
      user,
    });

    const updatedEscalation = await db.query.escalations.findFirst({
      where: eq(escalations.id, escalation.id),
    });
    expect(updatedEscalation?.resolvedAt).not.toBeNull();
  });
});
