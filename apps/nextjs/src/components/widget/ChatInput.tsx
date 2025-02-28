import { Textarea } from "@/components/ui/textarea";
import ShadowHoverButton from "@/components/widget/ShadowHoverButton";

type Props = {
  input: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: (e?: { preventDefault: () => void }) => void;
  isLoading: boolean;
};

export default function ChatInput({ input, inputRef, handleInputChange, handleSubmit, isLoading }: Props) {
  return (
    <div className="h-24 border-t border-black p-4">
      <form onSubmit={handleSubmit}>
        <div className="flex items-start justify-between">
          <Textarea
            aria-label="Ask a question"
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Ask a question"
            className="max-w-md placeholder:text-gray-700 text-black flex-1 resize-none border-none bg-transparent p-0 outline-none focus:border-none focus:outline-none focus:ring-0"
            rows={3}
            disabled={isLoading}
          />
          <ShadowHoverButton isLoading={isLoading} />
        </div>
      </form>
    </div>
  );
}
