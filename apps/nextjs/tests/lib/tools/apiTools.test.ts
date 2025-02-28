import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { toolsFactory } from "@tests/support/factories/tools";
import { userFactory } from "@tests/support/factories/users";
import { generateText } from "ai";
import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { conversationMessages, MessageRole } from "@/db/schema/conversationMessages";
import { getMetadataApiByMailbox } from "@/lib/data/mailboxMetadataApi";
import { fetchMetadata } from "@/lib/data/retrieval";
import { buildAITools, callToolApi, generateAvailableTools, ToolApiError } from "@/lib/tools/apiTool";

vi.mock("ai", () => ({
  generateEmbedding: vi.fn(),
  generateText: vi.fn(),
}));

vi.mock("@/lib/data/mailboxMetadataApi", () => ({
  getMetadataApiByMailbox: vi.fn(),
}));

vi.mock("@/lib/data/retrieval", () => ({
  fetchMetadata: vi.fn(),
}));

describe("apiTools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildAITools", () => {
    it("builds AI tools from tool definitions", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const { tool } = await toolsFactory.create({
        mailboxId: mailbox.id,
        parameters: [
          { name: "param1", type: "string", required: true, in: "body" },
          { name: "param2", type: "number", required: false, in: "query" },
        ],
      });

      const aiTools = buildAITools([tool]);

      expect(aiTools[tool.slug]).toBeDefined();
      expect(aiTools[tool.slug].description).toBe(`${tool.name} - ${tool.description}`);
      expect(aiTools[tool.slug].parameters).toBeDefined();
    });
  });

  describe("callToolApi", () => {
    it("calls API with correct parameters and headers", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
      const { tool } = await toolsFactory.create({
        mailboxId: mailbox.id,
        requestMethod: "POST",
        url: "https://api.example.com/test",
        parameters: [{ name: "param1", type: "string", required: true, in: "body" }],
        headers: {},
        authenticationMethod: "bearer_token",
        authenticationToken: "test-token",
      });

      vi.mocked(generateText).mockResolvedValueOnce({ text: "Success response" } as any);
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: "Success response" }),
      });

      const result = await callToolApi(conversation, tool, { param1: "test value" });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          method: "POST",
          headers: expect.any(Headers),
          body: JSON.stringify({ param1: "test value" }),
        }),
      );
      expect(result.success).toBe(true);
      expect(result.message).toBe("Success response");
    });

    it("handles API errors", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
      const { tool } = await toolsFactory.create({
        mailboxId: mailbox.id,
      });

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        statusText: "Bad Request",
        text: () => Promise.resolve("Error details"),
      });
      vi.mocked(generateText).mockResolvedValueOnce({ text: "API error occurred" } as any);

      const result = await callToolApi(conversation, tool, {});

      expect(result.success).toBe(false);
      expect(result.message).toBe("API error occurred");
    });

    it("throws ToolApiError for missing required parameters", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
      const { tool } = await toolsFactory.create({
        mailboxId: mailbox.id,
        parameters: [{ name: "required_param", type: "string", required: true, in: "body" }],
      });

      await expect(callToolApi(conversation, tool, {})).rejects.toThrow(ToolApiError);
    });

    it("throws ToolApiError for invalid parameter types", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
      const { tool } = await toolsFactory.create({
        mailboxId: mailbox.id,
        parameters: [{ name: "required_param", type: "string", required: true, in: "body" }],
      });
      await expect(callToolApi(conversation, tool, { required_param: 123 })).rejects.toThrow(ToolApiError);
    });

    it("includes query parameters in the URL", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
      const { tool } = await toolsFactory.create({
        mailboxId: mailbox.id,
        requestMethod: "GET",
        url: "https://api.example.com/test",
        parameters: [{ name: "param1", type: "string", required: true, in: "query" }],
      });

      vi.mocked(generateText).mockResolvedValueOnce({ text: "Success response" } as any);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: "Success response" }),
      });

      const result = await callToolApi(conversation, tool, { param1: "test value" });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/test?param1=test+value",
        expect.objectContaining({
          method: "GET",
        }),
      );
      expect(result.success).toBe(true);
    });

    it("replaces path parameters in the URL", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
      const { tool } = await toolsFactory.create({
        mailboxId: mailbox.id,
        requestMethod: "GET",
        url: "https://api.example.com/test/{param1}/show",
        parameters: [
          { name: "param1", type: "string", required: true, in: "path" },
          { name: "param2", type: "string", required: false, in: "body" },
        ],
      });

      vi.mocked(generateText).mockResolvedValueOnce({ text: "Success response" } as any);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: "Success response" }),
      });

      const result = await callToolApi(conversation, tool, { param1: "test-value" });

      expect(fetch).toHaveBeenCalledWith(
        "https://api.example.com/test/test-value/show",
        expect.objectContaining({
          method: "GET",
        }),
      );
      expect(result.success).toBe(true);
    });

    it("properly sets content-type header when not provided", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
      const { tool } = await toolsFactory.create({
        mailboxId: mailbox.id,
        requestMethod: "POST",
        url: "https://api.example.com/test",
        headers: {},
      });

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: "Success" }),
      });

      vi.mocked(generateText).mockResolvedValueOnce({ text: "Response received" } as any);

      await callToolApi(conversation, tool, {});

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.any(Headers),
        }),
      );

      const headers = (fetch as any).mock.calls[0][1].headers;
      expect(headers.get("Content-Type")).toBe("application/json");
    });

    it("respects custom headers from tool configuration", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
      const { tool } = await toolsFactory.create({
        mailboxId: mailbox.id,
        requestMethod: "GET",
        url: "https://api.example.com/test",
        headers: {
          "X-Custom-Header": "custom-value",
          "Content-Type": "application/xml",
        },
      });

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: "Success" }),
      });

      vi.mocked(generateText).mockResolvedValueOnce({ text: "Response received" } as any);

      await callToolApi(conversation, tool, {});

      const headers = (fetch as any).mock.calls[0][1].headers;
      expect(headers.get("X-Custom-Header")).toBe("custom-value");
      expect(headers.get("Content-Type")).toBe("application/xml");
    });

    it("creates tool event with response data", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
      const { tool } = await toolsFactory.create({
        mailboxId: mailbox.id,
        requestMethod: "POST",
        url: "https://api.example.com/test",
      });

      const responseData = { status: "success", data: { id: 123 } };
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
      });

      vi.mocked(generateText).mockResolvedValueOnce({ text: "Success message" } as any);

      await callToolApi(conversation, tool, { param: "value" });

      const toolMessage = await db.query.conversationMessages.findFirst({
        where: and(eq(conversationMessages.conversationId, conversation.id), eq(conversationMessages.role, "tool")),
        orderBy: (messages, { desc }) => [desc(messages.createdAt)],
      });

      expect(toolMessage).toBeDefined();
      expect(toolMessage?.metadata).toEqual({
        tool: {
          id: tool.id,
          slug: tool.slug,
          name: tool.name,
          description: tool.description,
          requestMethod: tool.requestMethod,
          url: tool.url,
        },
        parameters: { param: "value" },
        result: responseData,
        success: true,
      });
      expect(toolMessage?.body).toBe("Success message");
    });
  });

  describe("generateAvailableTools", () => {
    it("generates available tools based on conversation context", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
      await conversationMessagesFactory.create(conversation.id, {
        role: "user",
        body: "Test message",
      });

      vi.mocked(getMetadataApiByMailbox).mockResolvedValueOnce(null);
      const { tool } = await toolsFactory.create({
        mailboxId: mailbox.id,
        slug: "test-tool",
        parameters: [{ name: "param1", type: "string", required: true, in: "body" }],
      });
      vi.mocked(generateText).mockResolvedValueOnce({
        toolCalls: [{ toolName: "test-tool", args: { param1: "value1" } }],
      } as any);

      const result = await generateAvailableTools(conversation, mailbox, [tool]);

      expect(result).toHaveLength(1);
      expect(result[0]?.slug).toBe("test-tool");
      expect(result[0]?.parameters).toEqual({ param1: "value1" });
    });

    it("includes metadata in tool generation when available", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
      const metadata = {
        metadata: {
          name: "Test Customer",
          value: 100,
          links: { profile: "https://example.com" },
        },
        prompt: "Test prompt",
      };

      vi.mocked(getMetadataApiByMailbox).mockResolvedValueOnce({
        id: 1,
        mailboxId: 1,
        url: "test",
        isEnabled: true,
        hmacSecret: "test",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      });
      vi.mocked(fetchMetadata).mockResolvedValueOnce(metadata);
      vi.mocked(generateText).mockResolvedValueOnce({
        toolCalls: [{ toolName: "test-tool", args: { param1: "value1" } }],
      } as any);

      const { tool } = await toolsFactory.create({
        mailboxId: mailbox.id,
        slug: "test-tool",
        parameters: [{ name: "param1", type: "string", required: true, in: "body" }],
      });

      await generateAvailableTools(conversation, mailbox, [tool]);

      expect(generateText).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringContaining("Test Customer"),
        }),
      );
    });

    it("includes both user and assistant messages in conversation context", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);

      // Create test messages
      const messages = [
        { role: "user", body: "Test user message" },
        { role: "ai_assistant", body: "Test assistant response" },
      ];

      for (const msg of messages) {
        await conversationMessagesFactory.create(conversation.id, {
          role: msg.role as MessageRole,
          body: msg.body,
          cleanedUpText: msg.body,
        });
      }

      vi.mocked(getMetadataApiByMailbox).mockResolvedValueOnce(null);
      vi.mocked(generateText).mockResolvedValueOnce({
        toolCalls: [{ toolName: "test-tool", args: {} }],
      } as any);

      const { tool } = await toolsFactory.create({
        mailboxId: mailbox.id,
        slug: "test-tool",
      });

      await generateAvailableTools(conversation, mailbox, [tool]);

      expect(generateText).toHaveBeenCalledWith({
        model: expect.any(Object),
        experimental_telemetry: {
          functionId: "list-available-tools",
          isEnabled: true,
        },
        maxSteps: 1,
        temperature: 0.5,
        maxTokens: 1000,
        system: expect.any(String),
        prompt: expect.stringContaining(
          ["user: Test user message", "ai_assistant: Test assistant response"].join("\n"),
        ),
        toolChoice: "required",
        tools: expect.any(Object),
      });
    });
  });
});
