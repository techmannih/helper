import { TrashIcon } from "@heroicons/react/24/outline";
import { isEqual, pick } from "lodash";
import { useState } from "react";
import type { FAQ, UpsertFAQ } from "@/app/types/global";
import { toast } from "@/components/hooks/use-toast";
import TipTapEditor from "@/components/tiptap/editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/trpc/react";
import type { NewRow as NewRowType } from "./useSettings";

type FAQEditFormProps = {
  faq: UpsertFAQ;
  onSubmit: () => void;
  onCancel?: () => void;
  onChange?: (faq: UpsertFAQ) => void;
  isLoading: boolean;
};

export const FAQEditForm = ({ faq, isLoading, onSubmit, onCancel, onChange }: FAQEditFormProps) => {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="border rounded-lg p-4 space-y-4"
    >
      <div className="grid gap-4">
        <div>
          <Label>Question</Label>
          <Input
            name="question"
            value={faq.question}
            required={true}
            placeholder="e.g., How do I process a refund?"
            onChange={(e) => onChange?.({ ...faq, question: e.target.value })}
          />
        </div>
        <div>
          <Label>Reply</Label>
          <div className="min-h-[10rem]">
            <TipTapEditor
              key={faq.id}
              defaultContent={{ content: faq.reply }}
              onUpdate={(content) => onChange?.({ ...faq, reply: content })}
            />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
};

type FAQItemProps = {
  mailboxSlug: string;
  onDelete: () => void;
  faq?: FAQ & Partial<NewRowType>;
};

const FAQItem = ({ mailboxSlug, faq, onDelete }: FAQItemProps) => {
  const [editingFaq, setEditingFaq] = useState<UpsertFAQ | null>(null);

  const utils = api.useUtils();
  const upsertMutation = api.mailbox.faqs.upsert.useMutation({
    onSuccess: () => {
      utils.mailbox.faqs.list.invalidate({ mailboxSlug });
      setEditingFaq(null);
    },
    onError: () => {
      toast({ title: "Error updating FAQ", variant: "destructive" });
    },
  });

  const handleUpsertFaq = async () => {
    const editableFields = ["question", "body", "reply"];
    if (!editingFaq || isEqual(pick(faq, editableFields), pick(editingFaq, editableFields))) return;
    await upsertMutation.mutateAsync(editingFaq);
  };

  const handleStartEditing = () => {
    if (!faq) return;
    setEditingFaq({
      id: faq.id,
      question: faq.question,
      reply: faq.reply,
      mailboxSlug,
    });
  };

  return (
    <div className="mb-2">
      {editingFaq ? (
        <FAQEditForm
          faq={editingFaq}
          onChange={setEditingFaq}
          onSubmit={() => handleUpsertFaq()}
          onCancel={() => setEditingFaq(null)}
          isLoading={upsertMutation.isPending}
        />
      ) : (
        <div className="flex justify-between gap-2">
          <button
            className={"w-full text-left text-sm hover:underline"}
            onClick={(e) => {
              e.preventDefault();
              handleStartEditing();
            }}
          >
            {faq?.question ? faq.question : <span className="text-muted-foreground">(no question)</span>}
          </button>
          <div>
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
            >
              <TrashIcon className="h-4 w-4" />
              <span className="sr-only">Delete</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQItem;
