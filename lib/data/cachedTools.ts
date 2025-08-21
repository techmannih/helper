import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { platformCustomers, toolCaches } from "@/db/schema";
import { findOrCreatePlatformCustomerByEmail } from "./platformCustomer";
import type { ToolRequestBody } from "@/packages/client/dist";

export type CachedToolMap = Record<string, ToolRequestBody>;

export const cacheTools = async (
  mailboxId: number,
  tools: Record<string, ToolRequestBody>,
  customerEmail?: string | null,
) => {
  const serverTools = Object.fromEntries(
    Object.entries(tools).filter(([, tool]) => tool.serverRequestUrl),
  );
  if (Object.keys(serverTools).length === 0) return;

  let platformCustomerId: number | null = null;
  if (customerEmail) {
    platformCustomerId = (
      await findOrCreatePlatformCustomerByEmail(customerEmail)
    )?.id ?? null;
  }

  await db
    .insert(toolCaches)
    .values({ mailboxId, platformCustomerId, tools: serverTools })
    .onConflictDoUpdate({
      target: [toolCaches.mailboxId, toolCaches.platformCustomerId],
      set: { tools: serverTools },
    });
};

export const getCachedTools = async (
  mailboxId: number,
  customerEmail?: string | null,
): Promise<CachedToolMap> => {
  if (customerEmail) {
    const customer = await db.query.platformCustomers.findFirst({
      where: eq(platformCustomers.email, customerEmail),
      columns: { id: true },
    });
    if (customer) {
      const cached = await db.query.toolCaches.findFirst({
        where: and(eq(toolCaches.mailboxId, mailboxId), eq(toolCaches.platformCustomerId, customer.id)),
      });
      if (cached) return (cached.tools as CachedToolMap) ?? {};
    }
  }

  const global = await db.query.toolCaches.findFirst({
    where: and(eq(toolCaches.mailboxId, mailboxId), isNull(toolCaches.platformCustomerId)),
  });
  return (global?.tools as CachedToolMap) ?? {};
};
