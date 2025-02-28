import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { conversationMessages } from "@/db/schema";
import { runAIQuery } from "@/lib/ai";
import { generateResponseWithPrompt } from "@/lib/ai/generateResponseWithPrompt";
import { getClerkOrganization } from "@/lib/data/organization";

vi.mock(import("@/lib/ai"), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    runAIQuery: vi.fn(),
  };
});

vi.mock("@/lib/data/organization", () => ({
  getClerkOrganization: vi.fn(),
}));

describe("generateResponseWithPrompt", () => {
  const mockSubject = "Re: Account enquiry";
  const mockBody = "My purchase failed. Please help!";
  const mockBasePrompt = "You are a helpful assistant.";
  const mockAppendPrompt = "Generate a text to reply based on metadata.";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("constructs messages from past messages", async () => {
    const { mailbox, organization } = await userFactory.createRootUser({
      mailboxOverrides: { responseGeneratorPrompt: [mockBasePrompt] },
    });
    const { conversation } = await conversationFactory.create(mailbox.id, { subject: mockSubject });
    const messages = [
      { role: "user", body: "First message" },
      { role: "staff", body: "A staff reply" },
      { role: "user", body: "A user reply" },
      { role: "ai_assistant", body: "AI reply" },
      { role: "user", body: "User reply 2" },
    ];
    const mockMessages: (typeof conversationMessages.$inferInsert)[] = [];
    for (const message of messages) {
      const { message: mockMessage } = await conversationMessagesFactory.create(conversation.id, {
        role: message.role as "user" | "staff" | "ai_assistant",
        body: message.body,
        cleanedUpText: message.body,
      });
      mockMessages.push(mockMessage);
    }

    vi.mocked(runAIQuery).mockResolvedValueOnce("AI response");
    vi.mocked(getClerkOrganization).mockResolvedValue(organization);

    const lastMessage = mockMessages[mockMessages.length - 1] as typeof conversationMessages.$inferSelect;
    const messageWithConversation = { ...lastMessage, conversation };
    const result = await generateResponseWithPrompt({
      message: messageWithConversation,
      mailbox,
      appendPrompt: mockAppendPrompt,
      metadata: null,
    });

    expect(runAIQuery).toHaveBeenCalledWith({
      functionId: "generate-response-with-prompt",
      mailbox,
      queryType: "response_generator",
      messages: [
        { role: "user", content: "First message" },
        { role: "assistant", content: "A staff reply" },
        { role: "user", content: "A user reply" },
        { role: "assistant", content: "AI reply" },
        { role: "user", content: "Re: Account enquiry\n\nUser reply 2" },
      ],
      system: `${mockBasePrompt}

${mockAppendPrompt}`,
    });
    expect(result).toBe("AI response");
  });

  it("adds start message when the first message is not from user", async () => {
    const { mailbox, organization } = await userFactory.createRootUser({
      mailboxOverrides: { responseGeneratorPrompt: [mockBasePrompt] },
    });
    const { conversation } = await conversationFactory.create(mailbox.id, { subject: mockSubject });
    const messages = [
      { role: "staff", body: "Message 1 from staff" },
      { role: "user", body: "A user reply" },
      { role: "staff", body: "Message 2 from staff" },
      { role: "user", body: "User reply 2" },
    ];
    const mockMessages: (typeof conversationMessages.$inferInsert)[] = [];
    for (const message of messages) {
      const { message: mockMessage } = await conversationMessagesFactory.create(conversation.id, {
        role: message.role as "user" | "staff" | "ai_assistant",
        body: message.body,
        cleanedUpText: message.body,
      });
      mockMessages.push(mockMessage);
    }

    vi.mocked(runAIQuery).mockResolvedValueOnce("AI response");
    vi.mocked(getClerkOrganization).mockResolvedValue(organization);

    const lastMessage = mockMessages[mockMessages.length - 1] as typeof conversationMessages.$inferSelect;
    const messageWithConversation = { ...lastMessage, conversation };
    const result = await generateResponseWithPrompt({
      message: messageWithConversation,
      mailbox,
      appendPrompt: mockAppendPrompt,
      metadata: null,
    });

    expect(runAIQuery).toHaveBeenCalledWith({
      functionId: "generate-response-with-prompt",
      mailbox,
      queryType: "response_generator",
      messages: [
        { role: "user", content: "Start" },
        { role: "assistant", content: "Message 1 from staff" },
        { role: "user", content: "A user reply" },
        { role: "assistant", content: "Message 2 from staff" },
        { role: "user", content: "Re: Account enquiry\n\nUser reply 2" },
      ],
      system: `${mockBasePrompt}

${mockAppendPrompt}`,
    });
    expect(result).toBe("AI response");
  });

  it("generates a response with the given prompt and metadata", async () => {
    const { mailbox, organization } = await userFactory.createRootUser({
      mailboxOverrides: { responseGeneratorPrompt: [mockBasePrompt] },
    });
    const { conversation } = await conversationFactory.create(mailbox.id, { subject: mockSubject });
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      body: mockBody,
      cleanedUpText: mockBody,
    });
    const mockMetadata = { key: "value" };

    vi.mocked(runAIQuery).mockResolvedValueOnce("AI response");
    vi.mocked(getClerkOrganization).mockResolvedValue(organization);

    const messageWithConversation = { ...message, conversation };
    const result = await generateResponseWithPrompt({
      message: messageWithConversation,
      mailbox,
      appendPrompt: mockAppendPrompt,
      metadata: mockMetadata,
    });

    expect(runAIQuery).toHaveBeenCalledWith({
      functionId: "generate-response-with-prompt",
      mailbox,
      queryType: "response_generator",
      messages: [{ role: "user", content: `${conversation.subject}\n\n${mockBody}` }],
      system: `${mockBasePrompt}

${mockAppendPrompt}

Metadata:
{"key":"value"}`,
    });
    expect(result).toBe("AI response");
  });

  it("generates a response with no metadata", async () => {
    const { mailbox, organization } = await userFactory.createRootUser({
      mailboxOverrides: { responseGeneratorPrompt: ["You are a helpful assistant."] },
    });
    const { conversation } = await conversationFactory.create(mailbox.id, { subject: mockSubject });
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      body: mockBody,
      cleanedUpText: mockBody,
    });

    vi.mocked(runAIQuery).mockResolvedValueOnce("AI response");
    vi.mocked(getClerkOrganization).mockResolvedValue(organization);

    const messageWithConversation = { ...message, conversation };
    const result = await generateResponseWithPrompt({
      message: messageWithConversation,
      mailbox,
      appendPrompt: mockAppendPrompt,
      metadata: null,
    });

    expect(runAIQuery).toHaveBeenCalledWith({
      functionId: "generate-response-with-prompt",
      mailbox,
      queryType: "response_generator",
      messages: [{ role: "user", content: `${conversation.subject}\n\n${mockBody}` }],
      system: `${mockBasePrompt}

${mockAppendPrompt}`,
    });
    expect(result).toBe("AI response");
  });
});
