import { fail } from "assert";
import { Organization, User } from "@clerk/nextjs/server";
import { mailboxMetadataApiFactory } from "@tests/support/factories/mailboxesMetadataApi";
import { userFactory } from "@tests/support/factories/users";
import { workflowActionFactory } from "@tests/support/factories/workflowActions";
import { workflowFactory } from "@tests/support/factories/workflows";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMetadataApiByMailbox } from "@/lib/data/mailboxMetadataApi";
import { createEndpoint, deleteEndpoint, testEndpoint } from "@/serverActions/metadata-endpoint";

const mockServerActionDeps = () => {
  vi.mock("next/cache", () => ({
    revalidatePath: () => vi.fn(),
  }));

  vi.mock("react", async (importOriginal) => {
    const testCache = <T extends (...args: unknown[]) => unknown>(func: T) => func;
    const originalModule = await importOriginal<typeof import("react")>();
    return {
      ...originalModule,
      cache: testCache,
    };
  });

  vi.mock("@/trpc/server", async (importOriginal) => {
    const originalModule = await importOriginal<typeof import("@/trpc")>();
    return {
      ...originalModule,
      createContext: () => createTestTRPCContext(user, organization),
    };
  });
};

mockServerActionDeps();
let user: User;
let organization: Organization;

beforeEach(() => {
  vi.useRealTimers();
});

describe("createEndpoint", () => {
  it("adds the endpoint", async () => {
    const { user: rootUser, mailbox, organization: rootOrganization } = await userFactory.createRootUser();
    user = rootUser;
    organization = rootOrganization;
    expect(await getMetadataApiByMailbox(mailbox)).toBeNull();

    const url = "https://example.com";
    await createEndpoint({ mailboxSlug: mailbox.slug, url });

    const metadataApi = await getMetadataApiByMailbox(mailbox);
    expect(metadataApi).toEqual({
      id: expect.any(Number),
      mailboxId: mailbox.id,
      url,
      isEnabled: true,
      hmacSecret: expect.stringMatching(/^hlpr_/),
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      deletedAt: null,
    });
  });

  it("returns error when the endpoint already exists", async () => {
    const { user: rootUser, mailbox, organization: rootOrganization } = await userFactory.createRootUser();
    user = rootUser;
    organization = rootOrganization;
    await mailboxMetadataApiFactory.create(mailbox.id, { url: "https://example.com" });

    const result = await createEndpoint({ mailboxSlug: mailbox.slug, url: "https://example2.com" });
    expect(result?.error).toEqual("Mailbox already has a metadata endpoint");
  });

  it("returns error when the input is not a URL", async () => {
    const { user: rootUser, mailbox, organization: rootOrganization } = await userFactory.createRootUser();
    user = rootUser;
    organization = rootOrganization;

    try {
      await createEndpoint({ mailboxSlug: mailbox.slug, url: "not_url" });
      fail();
    } catch (e) {
      const error = e as TRPCError;
      expect(error).toBeInstanceOf(TRPCError);
      expect(error.code).toBe("BAD_REQUEST");
      expect(JSON.parse(error.message)).toEqual([
        {
          validation: "url",
          code: "invalid_string",
          message: "Invalid url",
          path: ["url"],
        },
      ]);
    }
  });

  it("returns error when the URL protocol is not http or https", async () => {
    const { user: rootUser, mailbox, organization: rootOrganization } = await userFactory.createRootUser();
    user = rootUser;
    organization = rootOrganization;

    const result = await createEndpoint({ mailboxSlug: mailbox.slug, url: "htp://example.com" });
    expect(result?.error).toEqual("URL must start with http:// or https://");
  });
});

describe("deleteEndpoint", () => {
  it("deletes the endpoint", async () => {
    const { user: rootUser, mailbox, organization: rootOrganization } = await userFactory.createRootUser();
    user = rootUser;
    organization = rootOrganization;
    await mailboxMetadataApiFactory.create(mailbox.id);
    expect(await getMetadataApiByMailbox(mailbox)).toBeTruthy();

    await deleteEndpoint({ mailboxSlug: mailbox.slug });
    expect(await getMetadataApiByMailbox(mailbox)).toBeNull();
  });

  it("returns error when the endpoint is referenced in a workflow", async () => {
    const { user: rootUser, mailbox, organization: rootOrganization } = await userFactory.createRootUser();
    user = rootUser;
    organization = rootOrganization;

    await mailboxMetadataApiFactory.create(mailbox.id);
    const workflow = await workflowFactory.create(mailbox.id);
    await workflowActionFactory.create(workflow.id, {
      actionType: "send_auto_reply_from_metadata",
      actionValue: "some_value",
    });

    const result = await deleteEndpoint({ mailboxSlug: mailbox.slug });
    expect(result?.error).toEqual("Cannot delete a metadata endpoint that is referenced inside of a workflow");
  });
});

describe("testEndpoint", () => {
  let mailboxSlug = "";
  const url = "https://example.com";

  beforeEach(async () => {
    const { user: rootUser, mailbox, organization: rootOrganization } = await userFactory.createRootUser();
    user = rootUser;
    organization = rootOrganization;
    mailboxSlug = mailbox.slug;
    await mailboxMetadataApiFactory.create(mailbox.id, { url });
  });

  it("sends a test request to metadata endpoint", async () => {
    const time = new Date("2023-01-01 01:00:00");
    vi.setSystemTime(time);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ success: true, metadata: "Test successful" }),
    });
    global.fetch = mockFetch;
    const testEmail = "helpertest@example.com";
    const timestamp = Math.floor(time.getTime() / 1000);

    await testEndpoint({ mailboxSlug });
    expect(mockFetch).toHaveBeenCalledWith(
      `${url}?email=${encodeURIComponent(testEmail)}&timestamp=${timestamp}`,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("Bearer "),
        }),
      }),
    );
  });

  it("returns error when the endpoint returns HTTP error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not found",
    });
    global.fetch = mockFetch;

    const result = await testEndpoint({ mailboxSlug });
    expect(result?.error).toEqual("HTTP error occurred: 404");
  });

  it("returns error when the endpoint returns an invalid JSON structure", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => ({ success: true }),
    });
    global.fetch = mockFetch;

    const result = await testEndpoint({ mailboxSlug });
    expect(result?.error).toEqual("Invalid format for JSON response: 'user_info' Required");
  });
});
