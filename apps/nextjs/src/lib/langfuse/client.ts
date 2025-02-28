import { Langfuse } from "langfuse";
import { env } from "@/env";

export const langfuse = new Langfuse({
  publicKey: env.LANGFUSE_PUBLIC_KEY,
  secretKey: env.LANGFUSE_SECRET_KEY,
  baseUrl: env.NODE_ENV === "development" ? env.LANGFUSE_BASEURL : undefined,
});
