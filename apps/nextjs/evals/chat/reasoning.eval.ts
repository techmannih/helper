import { Factuality } from "autoevals";
import { evalite } from "evalite";
import { buildMessagesWithMocks, gumroadPrompt, runAIQuery } from "@/evals/support/chat";
import { faqsPrompt } from "@/lib/ai/prompts";

const REASONING_ENABLED = true;

// Langfuse trace: traces/6f591e9e-c1e8-4cfe-a83c-6325f8ed75a5?observation=e94d188bc13518ad
evalite("Reasoning - Identify valid payout method", {
  data: () => [
    {
      input: buildMessagesWithMocks({
        messages: [
          {
            id: "1",
            role: "user",
            content: "why i havent gotten paid on 24th jan?",
          },
          {
            id: "1",
            role: "assistant",
            content: `Tool response regarding payout of that user: { next_payout_date: "2025-01-31" balance_for_next_payout: "$62.40" payout_note: "Payout via PayPal on November 8, 2024 skipped because the account does not have a valid PayPal payment address" }`,
          },
          {
            id: "2",
            role: "user",
            content: "why i havent gotten paid on 24th jan?",
          },
        ],
        promptRetrievalData: {
          faqs: faqsPrompt([
            {
              question: "Generic payment decline - Buyer",
              reply:
                "<p>Hi there,<br><br>Sorry about this!<br><br>I'm afraid, all I can see is a generic payment decline from your bank’s end.<br><br>Kindly use another form of payment to complete your purchase or contact your bank for more information.<br><br>Let me know if you need any further assistance.</p>",
            },
          ]),
        },
        additionalPrompt: gumroadPrompt,
      }),
      expected: `Recommend the user to migrate their payout method to Stripe.`,
    },
  ],
  task: (input) => runAIQuery(input, REASONING_ENABLED),
  scorers: [Factuality],
});

evalite("Reasoning - Correct refund information", {
  data: () => [
    {
      input: buildMessagesWithMocks({
        messages: [
          {
            id: "1",
            role: "user",
            content: "My last order can be refunded?",
          },
        ],
        promptRetrievalData: {
          faqs: faqsPrompt([
            {
              question: "When the refund is possible?",
              reply:
                "Refunds are possible within 14 days of purchase. If you've already received the product, you can't get a refund. If you haven't received it yet, you can cancel your order and get a refund.",
            },
            {
              question: "How to refund an order?",
              reply:
                "To request a refund, please contact Gumroad support at support@gumroad.com. Provide your order number and a brief explanation of why you want a refund. We'll review your request and get back to you as soon as possible. In 7 days, if you don't get a response, please contact Gumroad support at support@gumroad.com.",
            },
          ]),
        },
        additionalPrompt: gumroadPrompt,
        tools: {
          find_last_order: {
            description: "Find the last order of the user",
            parameters: {
              type: "object",
              properties: {
                email: { type: "string", description: "The email of the user" },
              },
              required: ["email"],
            },
            executeReturn:
              "Last order of the user is a book called 'The Art of War', 20 days ago, and it was paid with a credit card",
          },
        },
      }),
      expected:
        "The response explains Gumroad’s refund policy, advises contacting the creator first, and offers further assistance from Gumroad support if needed.",
    },
  ],
  task: (input) => runAIQuery(input, REASONING_ENABLED),
  scorers: [Factuality],
});

evalite("Reasoning - Fees and overdraft explanation", {
  data: () => [
    {
      input: buildMessagesWithMocks({
        mailboxName: "Chase",
        messages: [
          {
            id: "1",
            role: "user",
            content:
              "Can you help me understand why I was charged a $35 fee on my checking account? I've never seen this before.",
          },
          {
            id: "2",
            role: "assistant",
            content:
              "I see a $35 overdraft fee was charged on your account on Monday. This happens when there are insufficient funds to cover a transaction.",
          },
          {
            id: "3",
            role: "user",
            content:
              "But I always keep at least $1000 in my account, and I just checked my balance yesterday. This doesn't make sense.",
          },
        ],
        promptRetrievalData: {
          faqs: "Q: What are common account fees? A: Monthly maintenance, overdraft, wire transfer fees.\nQ: How to avoid overdraft fees? A: Maintain minimum balance, enroll in overdraft protection.\nQ: What is overdraft protection? A: Links savings account to cover checking shortfalls.\nQ: How to dispute charges? A: Submit form within 60 days.\nQ: What are ATM fees? A: No fee at bank ATMs, $3 at others.",
        },
        additionalPrompt: [
          "Check pending transactions",
          "Review account history for unusual activity",
          "Verify all recent deposits cleared",
          "Check if any automatic payments processed",
        ],
      }),
      expected:
        "The AI should: 1) Check for pending transactions that might have affected available balance, 2) Review timing of recent deposits and withdrawals, 3) Look for any automatic payments or holds, 4) Explain difference between available and posted balance, 5) Offer to waive fee if this is first occurrence and customer maintains good balance history. Should NOT assume overdraft without investigating other possibilities.",
    },
  ],
  task: (input) => runAIQuery(input, REASONING_ENABLED),
  scorers: [Factuality],
});

evalite("Reasoning - Tool calling", {
  data: () => [
    {
      input: buildMessagesWithMocks({
        messages: [
          {
            id: "1",
            role: "user",
            content: "I need help with one of my past purchases, I would like a refund",
          },
          {
            id: "2",
            role: "assistant",
            content: `Certainly! I'd be happy to help you with your past purchase. To assist you better, I'll need some more information about the specific purchase you're inquiring about. Could you please provide me with the following details:
            The name of the product you purchased
            The approximate date of the purchase
            The email address you used for the purchase
            Once I have this information, I'll be able to look up your purchase and provide you with more specific assistance. Is there anything particular about the purchase you need help with, such as accessing the product, getting a receipt, or something else?`,
          },
          {
            id: "3",
            role: "user",
            content: "I purchased a book called 'The Art of War' on 20th December 2024",
          },
        ],
        promptRetrievalData: {
          faqs: faqsPrompt([
            {
              question: "Generic payment decline - Buyer",
              reply:
                "<p>Hi there,<br><br>Sorry about this!<br><br>I'm afraid, all I can see is a generic payment decline from your bank’s end.<br><br>Kindly use another form of payment to complete your purchase or contact your bank for more information.<br><br>Let me know if you need any further assistance.</p>",
            },
          ]),
        },
        additionalPrompt: gumroadPrompt.concat([
          "Use the refund_order tool only if the order can be refunded. Returned by the search_orders tool.",
        ]),
        tools: {
          search_orders: {
            description: "Search for orders",
            parameters: {
              type: "object",
              properties: {
                email: { type: "string", description: "The email of the user" },
              },
              required: ["email"],
            },
            executeReturn: "Order found and can be refunded",
          },
          refund_order: {
            description: "Refund an order",
            parameters: {
              type: "object",
              properties: {
                order_id: { type: "string", description: "The ID of the order" },
              },
              required: ["order_id"],
            },
            executeReturn: "Order refunded",
          },
        },
        getPastConversationsPrompt: null,
      }),
      expected: "Don't ask for the email address",
    },
  ],
  task: (input) => runAIQuery(input, REASONING_ENABLED),
  scorers: [Factuality],
});
