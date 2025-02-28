"use client";

import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { useParams } from "next/navigation";
import { useState } from "react";
import type { UpsertFAQ } from "@/app/types/global";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import FAQItem, { FAQEditForm } from "./faqItem";
import SectionWrapper from "./sectionWrapper";
import WebsiteCrawlSetting from "./websiteCrawlSetting";

const KnowledgeBaseSetting = () => {
  const params = useParams<{ mailbox_slug: string }>();

  const [newFaq, setNewFaq] = useState<UpsertFAQ>({
    question: "",
    reply: "",
    mailboxSlug: params.mailbox_slug,
  });
  const [showNewFaqForm, setShowNewFaqForm] = useState(false);
  const utils = api.useUtils();

  const { data: faqs = [], isLoading } = api.mailbox.faqs.list.useQuery({
    mailboxSlug: params.mailbox_slug,
  });

  const emptyFAQ: UpsertFAQ = {
    question: "",
    reply: "",
    mailboxSlug: params.mailbox_slug,
  };

  const upsertMutation = api.mailbox.faqs.upsert.useMutation({
    onSuccess: () => {
      utils.mailbox.faqs.list.invalidate({ mailboxSlug: params.mailbox_slug });
      setShowNewFaqForm(false);
      setNewFaq(emptyFAQ);
    },
    onError: () => {
      toast({
        title: newFaq.id ? "Error updating FAQ" : "Error creating FAQ",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = api.mailbox.faqs.delete.useMutation({
    onSuccess: () => {
      toast({
        title: "FAQ deleted!",
        variant: "success",
      });
      utils.mailbox.faqs.list.invalidate({ mailboxSlug: params.mailbox_slug });
    },
    onError: () => {
      toast({
        title: "Error deleting FAQ",
        variant: "destructive",
      });
    },
  });

  const handleUpsertFaq = async () => {
    if (!newFaq.question || !newFaq.reply) return;
    await upsertMutation.mutateAsync(newFaq);
  };

  const handleDeleteFaq = async (id: number) => {
    if (confirm("Are you sure you want to delete this FAQ?")) {
      await deleteMutation.mutateAsync({ mailboxSlug: params.mailbox_slug, id });
    }
  };

  return (
    <>
      <div className="space-y-6">
        <SectionWrapper
          title="FAQs"
          description={
            <>
              <div className="mb-2">
                Create FAQs with your standard responses to common questions (e.g., refund policies, login
                troubleshooting).
              </div>
              Helper will use these examples to provide consistent and accurate answers to similar questions.
            </>
          }
        >
          <div className="mb-4 divide-y divide-border [&>:not(:first-child)]:pt-2">
            {isLoading ? (
              <>
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-4">
                    <div className="grow space-y-2">
                      <div className="h-4 w-32 rounded bg-secondary animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                      <div className="h-4 w-48 rounded bg-secondary animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                    </div>
                    <div className="h-6 w-16 rounded bg-secondary animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                  </div>
                ))}
              </>
            ) : (
              faqs.map((faq) => (
                <FAQItem
                  key={faq.id}
                  faq={faq}
                  onDelete={() => handleDeleteFaq(faq.id)}
                  mailboxSlug={params.mailbox_slug}
                />
              ))
            )}
          </div>
          {showNewFaqForm ? (
            <div className="mb-4">
              <FAQEditForm
                faq={newFaq}
                onChange={setNewFaq}
                onSubmit={handleUpsertFaq}
                onCancel={() => {
                  setShowNewFaqForm(false);
                  setNewFaq(emptyFAQ);
                }}
                isLoading={upsertMutation.isPending}
              />
            </div>
          ) : (
            <Button
              variant="subtle"
              onClick={(e) => {
                e.preventDefault();
                setNewFaq(emptyFAQ);
                setShowNewFaqForm(true);
              }}
            >
              <PlusCircleIcon className="mr-2 h-4 w-4" />
              Add FAQ
            </Button>
          )}
        </SectionWrapper>

        <WebsiteCrawlSetting />
      </div>
    </>
  );
};

export default KnowledgeBaseSetting;
