import { createWriteStream } from "fs";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import { db } from "@/db/client";
import { faqs, mailboxes } from "@/db/schema";
import { Mailbox } from "@/lib/data/mailbox";
import { findSimilarWebsitePages } from "@/lib/data/retrieval";

const SIMILARITY_THRESHOLD = 0.6; // Higher threshold for stronger matches
const OUTPUT_FILE = "faq-analysis-results.txt";

const openai = new OpenAI();

const analyzeFAQ = async (
  faq: typeof faqs.$inferSelect,
  websitePages: {
    url: string;
    pageTitle: string;
    markdown: string;
    similarity: number;
  }[],
) => {
  const pagesText = websitePages
    .map(
      (page) => `
Page: ${page.pageTitle}
URL: ${page.url}
Similarity Score: ${(page.similarity * 100).toFixed(1)}%
Content:
${page.markdown.slice(0, 500)}...
---`,
    )
    .join("\n\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `Analyze if this FAQ is still needed or if it's adequately covered by the provided website pages.
Output your analysis in this format:
RECOMMENDATION: [KEEP or REMOVE]
REASONING: [Your detailed explanation]
COVERAGE_SCORE: [1-10, where 10 means website pages completely cover the FAQ content]

Be specific about what information is unique to the FAQ vs covered in the pages.`,
      },
      {
        role: "user",
        content: `
FAQ:
Question: ${faq.question}
Answer: ${faq.reply}

Relevant Website Pages:
${pagesText || "No similar pages found."}`,
      },
    ],
  });

  return {
    faq,
    websitePages,
    analysis: response.choices[0]?.message.content || "No analysis generated",
  };
};

const writeToFile = (content: string) => {
  const stream = createWriteStream(OUTPUT_FILE, { flags: "a" });
  stream.write(`${content}\n\n---\n\n`);
  stream.end();
};

export const analyzeFAQs = async (mailbox: Mailbox) => {
  console.log("Starting FAQ analysis...");

  const allFAQs = await db.query.faqs.findMany({
    where: eq(faqs.mailboxId, mailbox.id),
  });

  console.log(`Found ${allFAQs.length} FAQs to analyze`);

  for (const faq of allFAQs) {
    console.log(`Analyzing FAQ: ${faq.question.slice(0, 50)}...`);

    const similarPages = await findSimilarWebsitePages(
      `${faq.question} ${faq.reply}`,
      mailbox,
      5,
      SIMILARITY_THRESHOLD,
    );

    const result = await analyzeFAQ(faq, similarPages);

    const output = `
FAQ ID: ${faq.id}
Question: ${result.faq.question}
Answer: ${result.faq.reply}

Similar Pages Found: ${result.websitePages.length}
${result.websitePages
  .map(
    (page) => `
- ${page.pageTitle} (${(page.similarity * 100).toFixed(1)}% similar)
  URL: ${page.url}`,
  )
  .join("\n")}

Analysis:
${result.analysis}
`;

    writeToFile(output);
    console.log(`Analyzed FAQ ${faq.id}`);
  }

  console.log(`Analysis complete. Results written to ${OUTPUT_FILE}`);
};

export default async () => analyzeFAQs((await db.query.mailboxes.findFirst({ where: eq(mailboxes.slug, "gumroad") }))!);

// Example usage:
// import { getMailboxBySlug } from "@/lib/data/mailbox";
// const mailbox = await getMailboxBySlug("your-mailbox-slug");
// await analyzeFAQs(mailbox);
