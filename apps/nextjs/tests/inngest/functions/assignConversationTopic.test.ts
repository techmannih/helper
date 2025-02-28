import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { conversationsTopics } from "@/db/schema";
import { assignConversationTopic } from "@/inngest/functions/assignConversationTopic";
import { createConversationEmbedding } from "@/lib/ai/conversationEmbedding";
import { getConversationById } from "@/lib/data/conversation";
import { findSimilarConversations } from "@/lib/data/retrieval";

vi.mock("@/lib/ai/conversationEmbedding", () => ({
  createConversationEmbedding: vi.fn(),
}));

vi.mock("@/lib/data/retrieval", () => ({
  findSimilarConversations: vi.fn(),
}));

vi.mock("@/lib/data/conversation", () => ({
  getConversationById: vi.fn(),
}));

describe("assignConversationTopic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates embedding for conversation without one", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const embeddedConversation = { ...conversation, embedding: [0.1, 0.2, 0.3] };

    vi.mocked(getConversationById).mockResolvedValueOnce(conversation).mockResolvedValueOnce(embeddedConversation);
    vi.mocked(createConversationEmbedding).mockResolvedValueOnce(embeddedConversation);
    vi.mocked(findSimilarConversations).mockResolvedValueOnce([]);

    const report = await assignConversationTopic(conversation.id);

    expect(createConversationEmbedding).toHaveBeenCalledWith(conversation.id);
    expect(report.status).toBe("No similar conversations found");
  });

  it("assigns topic based on most similar conversations", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, {
      embedding: Array.from({ length: 1536 }, () => Math.random()),
    });

    const similarConversations = [
      {
        id: 1,
        similarity: 0.91,
        slug: "conv-1",
        createdAt: new Date(),
        subject: "Test 1",
        embeddingText: "text 1",
        messages: [],
      },
      {
        id: 2,
        similarity: 0.82,
        slug: "conv-2",
        createdAt: new Date(),
        subject: "Test 2",
        embeddingText: "text 2",
        messages: [],
      },
      {
        id: 3,
        similarity: 0.7,
        slug: "conv-3",
        createdAt: new Date(),
        subject: "Test 3",
        embeddingText: "text 3",
        messages: [],
      },
    ];

    await db.insert(conversationsTopics).values([
      { conversationId: 1, mailboxId: mailbox.id, topicId: 1, subTopicId: 1 },
      { conversationId: 2, mailboxId: mailbox.id, topicId: 1, subTopicId: 1 },
    ]);

    vi.mocked(getConversationById).mockResolvedValue(conversation);
    vi.mocked(findSimilarConversations).mockResolvedValueOnce(similarConversations as any);

    const report = await assignConversationTopic(conversation.id);

    expect(report.status).toBe("Topic assigned successfully");
    expect(report.selectedTopic).toEqual({ topicId: 1, subTopicId: 1 });
    expect(report.topicScores).toContainEqual({
      label: "1-1",
      similaritySum: 1.73,
      count: 2,
    });

    const assignedTopic = await db.query.conversationsTopics.findFirst({
      where: eq(conversationsTopics.conversationId, conversation.id),
    });
    expect(assignedTopic).toEqual(
      expect.objectContaining({
        topicId: 1,
        subTopicId: 1,
        createdAt: conversation.createdAt,
      }),
    );
  });

  it("returns no similar conversations when none found above threshold", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, {
      embedding: Array.from({ length: 1536 }, () => Math.random()),
    });

    vi.mocked(getConversationById).mockResolvedValue(conversation);
    vi.mocked(findSimilarConversations).mockResolvedValueOnce([]);

    const report = await assignConversationTopic(conversation.id);

    expect(report.status).toBe("No similar conversations found");
    expect(report.selectedTopic).toBeNull();
    expect(report.similarConversations).toEqual([]);
  });

  it("returns no topics when similar conversations have none assigned", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id, {
      embedding: Array.from({ length: 1536 }, () => Math.random()),
    });

    const similarConversations = [
      {
        id: 1,
        similarity: 0.9,
        slug: "conv-1",
        createdAt: new Date(),
        subject: "Test 1",
        embeddingText: "text 1",
        messages: [],
      },
      {
        id: 2,
        similarity: 0.8,
        slug: "conv-2",
        createdAt: new Date(),
        subject: "Test 2",
        embeddingText: "text 2",
        messages: [],
      },
    ];

    vi.mocked(getConversationById).mockResolvedValue(conversation);
    vi.mocked(findSimilarConversations).mockResolvedValueOnce(similarConversations as any);

    const report = await assignConversationTopic(conversation.id);

    expect(report.status).toBe("No topics found in similar conversations");
    expect(report.selectedTopic).toBeNull();
  });
});
