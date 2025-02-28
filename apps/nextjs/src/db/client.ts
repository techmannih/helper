import { ExtractTablesWithRelations } from "drizzle-orm";
import { PgTransaction } from "drizzle-orm/pg-core";
import { drizzle, PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { env } from "@/env";

export const createDbClient = (url: string, options: postgres.Options<any> = {}) => {
  // Disable prefetch as it is not supported for "Transaction" pool mode
  const client = postgres(url, { prepare: false, ...options });
  return drizzle(client, { schema, casing: "snake_case", logger: !!env.DRIZZLE_LOGGING });
};

type DrizzleClientType = ReturnType<typeof createDbClient>;

declare global {
  // eslint-disable-next-line no-var
  var drizzleGlobal: DrizzleClientType | undefined;
}

const db = global.drizzleGlobal ?? createDbClient(env.POSTGRES_URL);

export { db };

if (env.NODE_ENV !== "production") global.drizzleGlobal = db;

export type Transaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export type TransactionOrDb = Transaction | typeof db;
