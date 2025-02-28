import { getBaseUrl } from "@/components/constants";

export const REQUIRED_SCOPES = [
  "channels:join",
  "channels:read",
  "chat:write",
  "im:write",
  "users:read",
  "users:read.email",
];
export const SLACK_REDIRECT_URI = `${getBaseUrl()}/api/connect/slack/callback`;
