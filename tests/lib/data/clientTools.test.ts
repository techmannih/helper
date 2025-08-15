import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tools/openApiParser", () => ({
  parseToolsFromOpenAPISpec: vi.fn(),
}));

import { fetchOpenApiSpec, getMailboxToolsForChat, importToolsFromSpec } from "@/lib/data/tools";
import { parseToolsFromOpenAPISpec } from "@/lib/tools/openApiParser";
import { db } from "@/db/client";
import { tools as toolsTable, toolApis } from "@/db/schema";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { toolsFactory } from "@tests/support/factories/tools";
import { eq } from "drizzle-orm";

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("client tools data", () => {
  it("fetchOpenApiSpec adds Authorization header when apiKey provided", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue("spec") } as any);
    vi.stubGlobal("fetch", mockFetch);

    const result = await fetchOpenApiSpec("https://example.com", "key123");

    expect(mockFetch).toHaveBeenCalledWith("https://example.com", {
      headers: { Authorization: "Bearer key123" },
    });
    expect(result).toBe("spec");
  });

  it("fetchOpenApiSpec throws on HTTP errors", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, statusText: "Bad Request" } as any);
    vi.stubGlobal("fetch", mockFetch);

    await expect(fetchOpenApiSpec("https://example.com", null)).rejects.toThrow(
      "Failed to fetch API spec from URL: Bad Request",
    );
  });

  it("getMailboxToolsForChat returns only enabled chat tools", async () => {
    const { tool } = await toolsFactory.create({ enabled: true, availableInChat: true });
    await toolsFactory.create({ enabled: true, availableInChat: false });
    await toolsFactory.create({ enabled: false, availableInChat: true });

    const result = await getMailboxToolsForChat();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(tool.id);
  });

  it("importToolsFromSpec updates existing tools and inserts new ones", async () => {
    const { mailbox } = await mailboxFactory.create();
    const [api] = await db
      .insert(toolApis)
      .values({ name: "Test API", unused_mailboxId: mailbox.id })
      .returning({ id: toolApis.id });
    const toolApiId = api.id;

    await db.insert(toolsTable).values({
      name: "Old Tool",
      description: "Old",
      slug: "existing-tool",
      requestMethod: "GET",
      url: "http://old",
      headers: {},
      parameters: [],
      authenticationMethod: "none",
      authenticationToken: "old-token",
      toolApiId,
      enabled: true,
      availableInChat: true,
      availableInAnonymousChat: false,
    });

    vi.mocked(parseToolsFromOpenAPISpec).mockResolvedValue([
      {
        name: "Updated Tool",
        description: "Updated",
        slug: "existing-tool",
        requestMethod: "POST",
        url: "http://new",
        headers: {},
        parameters: [],
        authenticationMethod: "none",
        authenticationToken: "new-token",
        enabled: true,
        availableInChat: true,
        availableInAnonymousChat: false,
      },
      {
        name: "New Tool",
        description: "New",
        slug: "new-tool",
        requestMethod: "GET",
        url: "http://newtool",
        headers: {},
        parameters: [],
        authenticationMethod: "none",
        authenticationToken: "brand-new-token",
        enabled: true,
        availableInChat: false,
        availableInAnonymousChat: false,
      },
    ]);

    const result = await importToolsFromSpec({
      toolApiId,
      openApiSpec: "{}",
      apiKey: "api-key",
    });

    expect(result.toolsToUpdate).toHaveLength(1);
    expect(result.toolsToInsert).toHaveLength(1);

    const updated = await db.query.tools.findFirst({
      where: eq(toolsTable.slug, "existing-tool"),
    });
    const inserted = await db.query.tools.findFirst({
      where: eq(toolsTable.slug, "new-tool"),
    });

    expect(updated?.name).toBe("Updated Tool");
    expect(updated?.url).toBe("http://new");
    expect(updated?.authenticationToken).toBe("new-token");
    expect(inserted?.name).toBe("New Tool");
    expect(inserted?.toolApiId).toBe(toolApiId);
    expect(inserted?.authenticationToken).toBe("brand-new-token");
  });
});

