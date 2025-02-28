import { conversationMessages, conversations, mailboxes } from "@/db/schema";
import { runAIQuery } from "@/lib/ai";
import { GPT_4O_MINI_MODEL } from "@/lib/ai/core";
import { getTextWithConversationSubject } from "./data/conversationMessage";

const examples: [email: string, description: string][] = [
  [
    "Email: Delete my email from your files\n\nHi, Can you please delete my email address from your website and all newsletters. Thank you.",
    "The email is about deleting their account",
  ],
  [
    "Email: We have recently had people say checkout is adding a \"Tip\" but they can't remove it. We didn't add this as a feature we have had hundreds of people buy it without a tip, it just started showing up. Is there a reason this is happening!",
    "The email is about unexpected tips added to purchases",
  ],
  [
    "Email: Refund\n\nI need to get refund for this transaction, it was by mistake.",
    "The email is requesting a refund for their purchase",
  ],
  [
    "Email: Services not visible on Gumroad discover\n\nHello, I have added services and they are published. I cannot see my services in the marketplace. Thank you. Kind regards, Charlie",
    "The email is about their product not being visible on Gumroad discover",
  ],
  [
    "Email: RE: O365 Ebook\nAn additional $0.50 (fifty cents) charge? That wasn't from us - it must be a charge from your credit card provider for some reason. Perhaps the Gumroad support people can throw some light onto the topic. They're copied on this note and can track transactions (we can't). Cheers, David",
    "The email is about an unauthorized or unrecognized charge",
  ],
  [
    "Email: Re: New tender offer available\n\nyour site barely works. The tender page is just blank. Is there supposed to be something to click on?",
    "The email is about a tender offer page being blank/non-functional or the link to it not working",
  ],
  [
    "Email: Re: Regarding your Gumroad account\n\nHi I'm replying to the suspension on the account. What's the reason? Regards Nathan\n-- Original message --\nHi, We apologize for the inconvenience, but we noticed certain behaviors in your account that indicate possible violations of our Terms of Service.",
    "The email is about why their Gumroad account was suspended",
  ],
];

export async function generateWorkflowPrompt(
  conversation: typeof conversations.$inferSelect,
  message: typeof conversationMessages.$inferSelect,
  mailbox: typeof mailboxes.$inferSelect,
): Promise<string> {
  const systemPrompt = [
    `Generate a single-sentence, general description of the user email. Use keywords from the user email.`,
    `Examples:`,
    examples.map(([email, description]) => `${email}\n${description}`).join("\n\n"),
  ].join("\n\n");
  const userPrompt = await getTextWithConversationSubject(conversation, message);

  const response = await runAIQuery({
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    queryType: "workflow_prompt_generator",
    mailbox,
    model: GPT_4O_MINI_MODEL,
    temperature: 0,
    maxTokens: 30,
    functionId: "generate-workflow-prompt",
  });

  let formattedResponse = response.trim().replace("and", "or").trim();
  const punctuation = ".,:;!?'";
  if (formattedResponse && punctuation.includes(formattedResponse[formattedResponse.length - 1] ?? "")) {
    formattedResponse = formattedResponse.slice(0, -1);
  }
  return formattedResponse.replace(/^"(.*)"$/, "$1").trim();
}
