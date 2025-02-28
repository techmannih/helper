import * as Sentry from "@sentry/nextjs";
import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel";
import { env } from "./env";

export async function register() {
  if (env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }

  registerOTel({
    serviceName: "helper",
    traceExporter: new LangfuseExporter(),
  });
}

export const onRequestError = Sentry.captureRequestError;
