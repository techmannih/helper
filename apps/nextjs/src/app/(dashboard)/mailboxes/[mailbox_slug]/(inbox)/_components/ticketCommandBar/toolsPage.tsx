import { PlayIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useConversationContext } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/conversationContext";
import type { RouterOutputs } from "@/trpc";
import { api } from "@/trpc/react";
import { CommandGroup } from "./types";

type Tool = RouterOutputs["mailbox"]["conversations"]["tools"]["list"]["all"][number];

export const useToolsPage = (): {
  groups: CommandGroup[];
  clearSelectedTool: () => void;
  selectedTool: Tool | null;
} => {
  const { conversationSlug, mailboxSlug } = useConversationContext();
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);

  const { data: tools } = api.mailbox.conversations.tools.list.useQuery(
    { mailboxSlug, conversationSlug },
    { staleTime: Infinity, refetchOnMount: false, refetchOnWindowFocus: false, enabled: !!conversationSlug },
  );

  if (!tools) return { groups: [], selectedTool: null, clearSelectedTool: () => {} };

  return {
    selectedTool,
    clearSelectedTool: () => setSelectedTool(null),
    groups: [
      {
        heading: "Tools",
        items: tools.all.map((tool) => ({
          id: tool.slug,
          label: tool.name,
          icon: PlayIcon,
          onSelect: () => setSelectedTool(tool),
          preview: (
            <div className="p-4">
              <h3 className="font-medium mb-2">{tool.name}</h3>
              {tool.description && <p className="text-sm text-muted-foreground">{tool.description}</p>}
            </div>
          ),
        })),
      },
    ],
  };
};
