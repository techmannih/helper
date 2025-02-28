import { formatDuration } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { MessageWithReaction } from "@/components/widget/Message";

type Reasoning = {
  message: string;
  reasoningTimeSeconds: number;
};

export default function MessageElement({
  messageId,
  message,
  reasoning,
  token,
  conversationSlug,
}: {
  messageId: string | undefined;
  message: MessageWithReaction;
  reasoning: Reasoning | null;
  token: string | null;
  conversationSlug: string | null;
}) {
  const [showReasoning, setShowReasoning] = useState(false);

  const hasContent = message.content.length > 0;
  if (!hasContent) {
    return null;
  }

  const formattedReasoningTime = reasoning?.reasoningTimeSeconds
    ? formatDuration({ seconds: reasoning.reasoningTimeSeconds })
    : null;

  const handleReasoningClick = async () => {
    const newShowReasoning = !showReasoning;
    setShowReasoning(newShowReasoning);
    try {
      await fetch(`/api/chat/conversation/${conversationSlug}/message/${messageId}/event`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "reasoning_toggled",
          changes: {
            isVisible: newShowReasoning,
          },
        }),
      });
    } catch (error) {
      console.error("Failed to track reasoning toggle:", error);
    }
  };

  return (
    <div className="relative p-4">
      {reasoning && messageId && (
        <button
          onClick={handleReasoningClick}
          className="flex items-center gap-1 text-xs text-gray-800 hover:text-gray-700 transition-colors mb-2"
        >
          {showReasoning ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {formattedReasoningTime ? <span>Thought for {formattedReasoningTime}</span> : <span>Thoughts</span>}
        </button>
      )}
      {showReasoning && reasoning && (
        <ReactMarkdown className="border-l border-gray-500 mt-2 text-sm text-gray-800 px-2 mb-4 prose-p:mb-2">
          {reasoning.message}
        </ReactMarkdown>
      )}
      <ReactMarkdown
        className={`prose prose-sm max-w-none text-base ${message.role === "user" ? "text-white" : "text-black"}`}
        components={{
          a: ({ children, ...props }: any) => (
            <a target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>
          ),
        }}
      >
        {message.content}
      </ReactMarkdown>
    </div>
  );
}
