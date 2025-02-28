import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type MessageReaction = { type: "thumbs-up" } | { type: "thumbs-down"; feedback: string | null };

type MessageReactionResponse = {
  reaction: MessageReaction | null;
};

const reactionQueryKey = (messageId: string) => ["message-reaction", messageId];

async function submitReaction(
  token: string | null,
  messageId: string,
  conversationSlug: string,
  reaction: MessageReaction,
): Promise<MessageReaction | null> {
  if (!token) {
    throw new Error("Token is required");
  }
  const response = await fetch(`/api/chat/conversation/${conversationSlug}/message/${messageId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(reaction),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to submit reaction");
  }

  const data: MessageReactionResponse = await response.json();
  return data.reaction;
}

export function MessageReaction({
  messageId,
  conversationSlug,
  token,
  initialReaction,
}: {
  messageId: string;
  conversationSlug: string;
  token: string | null;
  initialReaction: MessageReaction | null;
}) {
  const queryClient = useQueryClient();
  const { data: latestReaction } = useQuery({
    queryKey: reactionQueryKey(messageId),
    initialData: initialReaction,
  });

  const reactionMutation = useMutation({
    mutationFn: (params: MessageReaction) => {
      return submitReaction(token, messageId, conversationSlug, params);
    },
    onSuccess: (newReaction) => {
      queryClient.setQueryData(reactionQueryKey(messageId), newReaction);
    },
  });

  const [showFeedbackInput, setShowFeedbackInput] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isThumbsUpAnimating, setIsThumbsUpAnimating] = useState(false);
  const [isThumbsDownAnimating, setIsThumbsDownAnimating] = useState(false);

  const isLoading = reactionMutation.isPending;

  const handleThumbsUp = async () => {
    setIsThumbsUpAnimating(true);
    try {
      await reactionMutation.mutateAsync({ type: "thumbs-up" });
    } catch (error) {
      console.error("Error toggling thumbs up:", error);
    } finally {
      setTimeout(() => setIsThumbsUpAnimating(false), 1000);
    }
  };

  const handleThumbsDown = async () => {
    setIsThumbsDownAnimating(true);

    if (hasThumbsDownFeedback) {
      try {
        await reactionMutation.mutateAsync(latestReaction);
      } catch (error) {
        console.error("Error toggling thumbs down:", error);
      } finally {
        setTimeout(() => setIsThumbsDownAnimating(false), 1000);
      }
      return;
    }

    try {
      await reactionMutation.mutateAsync({ type: "thumbs-down", feedback: null });
    } catch (error) {
      console.error("Error toggling thumbs down:", error);
    }

    setShowFeedbackInput(true);
    setTimeout(() => setIsThumbsDownAnimating(false), 1000);
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setIsSubmitting(true);
    setIsThumbsDownAnimating(true);
    try {
      await reactionMutation.mutateAsync({ type: "thumbs-down", feedback });
      setShowFeedbackInput(false);
      setFeedback("");
    } catch (error) {
      console.error("Error submitting feedback:", error);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setIsThumbsDownAnimating(false), 1000);
    }
  };

  const hasThumbsUpReaction = latestReaction?.type === "thumbs-up";
  const hasThumbsDownReaction = latestReaction?.type === "thumbs-down";
  const hasThumbsDownFeedback = hasThumbsDownReaction && !!latestReaction.feedback;

  return (
    <div className="relative">
      <TooltipProvider delayDuration={100}>
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleThumbsUp}
                disabled={isLoading}
                className={`h-6 px-2 rounded transition-all duration-300 group ${
                  hasThumbsUpReaction
                    ? "bg-green-500/25 text-green-700"
                    : "bg-black/5 hover:bg-black/10 text-gray-600 hover:text-black"
                } disabled:opacity-50`}
              >
                <motion.div
                  className="w-4 h-4 origin-bottom-left"
                  animate={
                    isThumbsUpAnimating && hasThumbsUpReaction
                      ? {
                          rotate: [0, 24, -16, -7, 0],
                          transition: {
                            duration: 1,
                            ease: "easeInOut",
                            repeatType: "reverse",
                            repeat: 0,
                          },
                        }
                      : {
                          rotate: 0,
                        }
                  }
                >
                  <ThumbsUp className="w-4 h-4" />
                </motion.div>
              </button>
            </TooltipTrigger>
            <TooltipContent>{hasThumbsUpReaction ? "Undo upvote" : "Upvote response"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleThumbsDown}
                disabled={isLoading}
                className={`h-6 px-2 rounded transition-all duration-300 group ${
                  hasThumbsDownFeedback
                    ? "bg-orange-500/25 text-orange-700"
                    : showFeedbackInput
                      ? "bg-black/25 text-gray-600"
                      : "bg-black/5 hover:bg-black/10 text-gray-600 hover:text-black"
                } disabled:opacity-50`}
              >
                <motion.div
                  className="w-4 h-4 origin-bottom-right"
                  animate={
                    isThumbsDownAnimating && hasThumbsDownFeedback
                      ? {
                          rotate: [0, 24, -16, -7, 0],
                          transition: {
                            duration: 1,
                            ease: "easeInOut",
                            repeatType: "reverse",
                            repeat: 0,
                          },
                        }
                      : {
                          rotate: 0,
                        }
                  }
                >
                  <ThumbsDown className="w-4 h-4" />
                </motion.div>
              </button>
            </TooltipTrigger>
            <TooltipContent>{hasThumbsDownFeedback ? "Undo downvote" : "Downvote response"}</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      <AnimatePresence>
        {showFeedbackInput && (
          <motion.form
            key="feedback-form"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleFeedbackSubmit}
            className="absolute left-0 top-8 mt-2 flex flex-col gap-2 p-4 bg-white rounded-lg border border-black min-w-[300px] shadow-lg z-10"
          >
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (feedback.trim()) {
                    handleFeedbackSubmit(e);
                  }
                }
              }}
              placeholder="What was wrong with this response?"
              className="w-full p-2 text-sm border border-black rounded resize-none"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowFeedbackInput(false)}
                disabled={isSubmitting}
                className="px-3 py-1 text-sm border border-black rounded hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!feedback.trim() || isSubmitting}
                className="px-3 py-1 text-sm bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
