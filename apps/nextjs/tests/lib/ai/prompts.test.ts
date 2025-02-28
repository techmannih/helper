import { describe, expect, it } from "vitest";
import { faqsPrompt } from "@/lib/ai/prompts";

describe("faqsPrompt", () => {
  it("formats FAQs correctly", () => {
    const mockFAQs = [
      {
        id: 1,
        question: "How do I process a refund?",
        reply: "To process a refund, follow these steps...",
        createdAt: new Date(),
        updatedAt: new Date(),
        mailboxId: 1,
        messageId: null,
        embedding: null,
      },
      {
        id: 2,
        question: "Where can I find my API key?",
        reply: "Your API key is located in settings...",
        createdAt: new Date(),
        updatedAt: new Date(),
        mailboxId: 1,
        messageId: null,
        embedding: null,
      },
    ];

    const result = faqsPrompt(mockFAQs);

    expect(result).toContain("Q: How do I process a refund?");
    expect(result).toContain("A: To process a refund, follow these steps...");
  });

  it("handles empty FAQs list", () => {
    const result = faqsPrompt([]);
    expect(result).toBe(
      "Here are some frequently asked questions and their standard answers. Use these exact answers when appropriate, only swapping out specific data, in order to solve the ticket:\n\n",
    );
  });
});
