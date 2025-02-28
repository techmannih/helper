import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { disconnectSlack } from "@/lib/data/mailbox";
import { verifySlackRequest } from "@/lib/slack/client";

export const POST = async (request: Request) => {
  const body = await request.text();
  if (!(await verifySlackRequest(body, request.headers))) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 403 });
  }

  const data = JSON.parse(body);

  if (data.type === "url_verification") {
    return NextResponse.json({ challenge: data.challenge });
  }

  if (data.type === "event_callback" && data.event.type === "tokens_revoked") {
    for (const userId of data.event.tokens.bot) {
      const mailbox = await db.query.mailboxes.findFirst({
        where: eq(mailboxes.slackTeamId, data.team_id) && eq(mailboxes.slackBotUserId, userId),
      });

      if (mailbox) await disconnectSlack(mailbox.id);
    }
    return new Response(null, { status: 200 });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
};
