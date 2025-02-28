import { StarIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import type { Message as MessageType } from "@/app/types/global";
import { toast } from "@/components/hooks/use-toast";
import { api } from "@/trpc/react";

const PinReplyAction = ({ mailboxSlug, slug, email }: { mailboxSlug: string; slug: string; email: MessageType }) => {
  const [isReplyPinned, setIsReplyPinned] = useState(false);
  const replyMutation = api.mailbox.conversations.messages.setPinned.useMutation();
  const handlePinReplyClick = async (emailId: number) => {
    try {
      await replyMutation.mutateAsync({
        mailboxSlug,
        conversationSlug: slug,
        id: emailId,
        isPinned: true,
      });
      toast({
        title: "Reply was pinned!",
        variant: "success",
      });
      setIsReplyPinned(true);
    } catch (error) {
      toast({
        title: "Error pinning reply",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    setIsReplyPinned(email.isPinned);
  }, [email]);

  return email.role !== "user" && !isReplyPinned ? (
    <button onClick={() => handlePinReplyClick(email.id)}>
      <div className="text-muted-foreground hover:text-primary text-xs flex items-center gap-1">
        <StarIcon className="h-3 w-3" />
        <span>Pin reply</span>
      </div>
    </button>
  ) : null;
};

export default PinReplyAction;
