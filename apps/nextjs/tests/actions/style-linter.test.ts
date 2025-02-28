import { Organization, User } from "@clerk/nextjs/server";
import { styleLinterFactory } from "@tests/support/factories/styleLinters";
import { userFactory } from "@tests/support/factories/users";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, test, vi } from "vitest";
import { MAX_STYLE_LINTERS } from "@/components/constants";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { deleteStyleLinter, upsertStyleLinter } from "@/serverActions/style-linter";
import { createCaller } from "@/trpc";

const mockServerActionDeps = () => {
  vi.mock("next/cache", () => ({
    revalidatePath: () => vi.fn(),
  }));

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

describe("upsertStyleLinter", () => {
  it("creates/updates style linters", async () => {
    const time = new Date("2023-01-01");
    vi.setSystemTime(time);

    const { user: rootUser, mailbox, organization: rootOrganization } = await userFactory.createRootUser();
    user = rootUser;
    organization = rootOrganization;

    const caller = createCaller(createTestTRPCContext(user, organization));

    expect(await caller.mailbox.styleLinters.list({ mailboxSlug: mailbox.slug })).toEqual([]);

    await upsertStyleLinter({ mailboxSlug: mailbox.slug, linter: { before: "before", after: "after" } });
    const linters = await caller.mailbox.styleLinters.list({ mailboxSlug: mailbox.slug });
    const linterId = assertDefined(linters[0]?.id);
    expect(linters).toEqual([
      {
        id: linterId,
        before: "before",
        after: "after",
      },
    ]);

    expect((await db.query.mailboxes.findFirst({ where: eq(mailboxes.id, mailbox.id) }))?.promptUpdatedAt).toEqual(
      time,
    );

    const time2 = new Date("2023-01-02");
    vi.setSystemTime(time2);

    await upsertStyleLinter({
      mailboxSlug: mailbox.slug,
      linter: { id: linterId, before: "before2", after: "after2" },
    });

    const updatedLinters = await caller.mailbox.styleLinters.list({ mailboxSlug: mailbox.slug });
    expect(updatedLinters).toEqual([
      {
        id: linterId,
        before: "before2",
        after: "after2",
      },
    ]);

    expect((await db.query.mailboxes.findFirst({ where: eq(mailboxes.id, mailbox.id) }))?.promptUpdatedAt).toEqual(
      time2,
    );
  });

  it("errors when exceeding the max style linter limit", async () => {
    const { user: rootUser, organization: rootOrganization, mailbox } = await userFactory.createRootUser();
    user = rootUser;
    organization = rootOrganization;

    for (let i = 0; i < MAX_STYLE_LINTERS; i++) {
      await styleLinterFactory.create(organization.id, { before: `before${i}`, after: `after${i}` });
    }

    try {
      await upsertStyleLinter({
        mailboxSlug: mailbox.slug,
        linter: { before: "new before", after: "new after" },
      });
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      expect(error).toMatchObject({
        code: "BAD_REQUEST",
        message: `You can only have a maximum of ${MAX_STYLE_LINTERS} style linters.`,
      });
    }
  });
});

test("deleteStyleLinter", async () => {
  const time = new Date("2023-01-01");
  vi.setSystemTime(time);

  const { user: rootUser, mailbox, organization: rootOrganization } = await userFactory.createRootUser();
  user = rootUser;
  organization = rootOrganization;

  const linter = await styleLinterFactory.create(organization.id, { before: "before", after: "after" });

  await deleteStyleLinter({ mailboxSlug: mailbox.slug, id: linter.id });

  const caller = createCaller(createTestTRPCContext(user, organization));
  expect(await caller.mailbox.styleLinters.list({ mailboxSlug: mailbox.slug })).toEqual([]);
  expect((await db.query.mailboxes.findFirst({ where: eq(mailboxes.id, mailbox.id) }))?.promptUpdatedAt).toEqual(time);
});
