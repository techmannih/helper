import { useStickToBottom } from "use-stick-to-bottom";
import LoadingAnimation from "@/components/widget/LoadingAnimation";
import Message, { MessageWithReaction } from "@/components/widget/Message";

type Props = {
  messages: MessageWithReaction[];
  conversationSlug: string | null;
  isGumroadTheme: boolean;
  showLoadingAnimation: boolean;
  token: string | null;
  addToolResult: (options: { toolCallId: string; result: unknown }) => void;
};

export default function MessagesList({
  messages,
  conversationSlug,
  isGumroadTheme,
  showLoadingAnimation,
  token,
  addToolResult,
}: Props) {
  const { scrollRef, contentRef } = useStickToBottom();

  return (
    <div className="flex-1 overflow-y-auto p-4" id="message-container" ref={scrollRef}>
      <div className="flex flex-col gap-6 pb-32" ref={contentRef}>
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            conversationSlug={conversationSlug}
            token={token}
            addToolResult={addToolResult}
          />
        ))}
        {showLoadingAnimation && <LoadingAnimation color={isGumroadTheme ? "gumroad-pink" : "black"} />}
      </div>
    </div>
  );
}
