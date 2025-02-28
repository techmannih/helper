import { and, eq, inArray } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { db } from "@/db/client";
import { conversationsTopics } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { createConversationEmbedding } from "@/lib/ai/conversationEmbedding";
import { getConversationById } from "@/lib/data/conversation";
import { getMailboxById } from "@/lib/data/mailbox";
import { findSimilarConversations } from "@/lib/data/retrieval";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";

const K_NEAREST_NEIGHBORS = 10;
const SIMILARITY_THRESHOLD = 0.5;

type TopicLabel = {
  topicId: number;
  subTopicId: number;
};

type LabelScore = {
  similaritySum: number;
  count: number;
};

type AssignmentReport = {
  similarConversations: { id: number; similarity: number }[];
  topicScores: { label: string; similaritySum: number; count: number }[];
  selectedTopic: { topicId: number; subTopicId: number } | null;
  status: string;
};

function findBestLabel(labelScores: Map<string, LabelScore>): TopicLabel | null {
  let bestLabel: TopicLabel | null = null;
  let highestSimilaritySum = 0;

  for (const [labelKey, score] of labelScores.entries()) {
    if (score.similaritySum > highestSimilaritySum) {
      highestSimilaritySum = score.similaritySum;
      const [topicIdStr, subTopicIdStr] = labelKey.split("-");
      const topicId = Number(topicIdStr);
      const subTopicId = Number(subTopicIdStr);

      if (isNaN(topicId) || isNaN(subTopicId)) continue;
      bestLabel = { topicId, subTopicId };
    }
  }

  return bestLabel;
}

export const assignConversationTopic = async (conversationId: number): Promise<AssignmentReport> => {
  const report: AssignmentReport = {
    similarConversations: [],
    topicScores: [],
    selectedTopic: null,
    status: "",
  };

  let conversation = assertDefinedOrRaiseNonRetriableError(await getConversationById(conversationId));

  if (!conversation.embedding) {
    await createConversationEmbedding(conversationId);
    conversation = assertDefinedOrRaiseNonRetriableError(await getConversationById(conversationId));
  }

  if (!conversation.embedding) {
    throw new NonRetriableError("Conversation has no embedding");
  }

  const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailboxById(conversation.mailboxId));
  const similarConversations = await findSimilarConversations(
    conversation.embedding,
    mailbox,
    K_NEAREST_NEIGHBORS,
    conversation.slug,
    SIMILARITY_THRESHOLD,
    true,
  );

  if (!similarConversations || similarConversations.length === 0) {
    report.status = "No similar conversations found";
    return report;
  }

  report.similarConversations = similarConversations.map((conv) => ({
    id: conv.id,
    similarity: conv.similarity,
  }));

  // Get topics for similar conversations
  const conversationsWithTopics = await db.query.conversationsTopics.findMany({
    where: and(
      eq(conversationsTopics.mailboxId, conversation.mailboxId),
      inArray(
        conversationsTopics.conversationId,
        similarConversations.map((conv) => conv.id),
      ),
    ),
    columns: {
      conversationId: true,
      topicId: true,
      subTopicId: true,
    },
  });

  // Group topics by conversation
  const topicsByConversation = new Map(
    similarConversations.map((conv) => [conv.id, conversationsWithTopics.filter((t) => t.conversationId === conv.id)]),
  );

  // Track similarity scores for each unique (topic, subtopic) combination
  const labelScores = new Map<string, LabelScore>();

  // Sum similarity scores for each topic+subtopic combination
  similarConversations.forEach((similarConversation) => {
    const topics = topicsByConversation.get(similarConversation.id) || [];
    if (topics.length === 0) return;

    topics.forEach(({ topicId, subTopicId }) => {
      if (topicId === null || subTopicId === null) return;

      const labelKey = `${topicId}-${subTopicId}`;
      const currentScore = labelScores.get(labelKey) || { similaritySum: 0, count: 0 };

      labelScores.set(labelKey, {
        similaritySum: currentScore.similaritySum + similarConversation.similarity,
        count: currentScore.count + 1,
      });
    });
  });

  if (labelScores.size === 0) {
    report.status = `No topics found in similar conversations`;
    return report;
  }

  // Convert scores to report format
  report.topicScores = Array.from(labelScores.entries()).map(([label, score]) => ({
    label,
    similaritySum: Number(score.similaritySum.toFixed(2)),
    count: score.count,
  }));

  const winningLabel = findBestLabel(labelScores);
  if (!winningLabel) {
    report.status = "Could not determine winning topic";
    return report;
  }

  report.selectedTopic = winningLabel;

  // Assign winning topic combination to conversation
  await db.insert(conversationsTopics).values({
    conversationId: conversation.id,
    mailboxId: conversation.mailboxId,
    topicId: winningLabel.topicId,
    subTopicId: winningLabel.subTopicId,
    createdAt: conversation.createdAt,
  });

  report.status = "Topic assigned successfully";
  return report;
};

export default inngest.createFunction(
  { id: "conversation-topic-assignment", concurrency: 5 },
  { event: "conversations/topic.assign" },
  async ({ event }) => {
    const { conversationId } = event.data;
    const report = await assignConversationTopic(conversationId);
    return { report };
  },
);
