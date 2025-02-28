import { ComponentType, useMemo } from "react";
import { renderMessageBody } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/renderMessageBody";
import { RouterOutputs } from "@/trpc";
import { CommandGroup } from "./types";

const EmptyIcon: ComponentType<{ className?: string }> = () => null;

type PreviousRepliesPageProps = {
  previousReplies: RouterOutputs["mailbox"]["conversations"]["messages"]["previousReplies"] | undefined;
  onInsertReply: (content: string) => void;
  onOpenChange: (open: boolean) => void;
  setPage: (page: "main" | "previous-replies" | "assignees") => void;
};

export const usePreviousRepliesPage = ({
  previousReplies,
  onInsertReply,
  onOpenChange,
  setPage,
}: PreviousRepliesPageProps): CommandGroup[] => {
  const contents = useMemo(
    () =>
      previousReplies?.map((reply) =>
        renderMessageBody({
          body: reply.content,
          isMarkdown: false,
          className: "prose-sm text-muted-foreground",
        }),
      ),
    [previousReplies],
  );

  return [
    {
      heading: "Previous Replies",
      items: (previousReplies || [])
        .sort((a, b) => b.similarity - a.similarity)
        .map((reply, index) => ({
          id: reply.id,
          label: reply.cleanedUpText.slice(0, 60) + (reply.cleanedUpText.length > 60 ? "..." : ""),
          icon: EmptyIcon,
          onSelect: () => {
            onInsertReply(reply.content ?? "");
            setPage("main");
            onOpenChange(false);
          },
          preview: (
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">Previous Reply</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{Math.round(reply.similarity * 100)}% match</span>
                  <time className="text-xs text-muted-foreground">
                    {new Date(reply.timestamp).toLocaleDateString()}
                  </time>
                </div>
              </div>
              <div className="[&_*]:!text-muted-foreground">
                {contents?.[index]?.mainContent}
                {reply.conversationSubject && (
                  <p className="text-xs mt-2">From conversation: {reply.conversationSubject}</p>
                )}
              </div>
            </div>
          ),
        })),
    },
  ];
};
