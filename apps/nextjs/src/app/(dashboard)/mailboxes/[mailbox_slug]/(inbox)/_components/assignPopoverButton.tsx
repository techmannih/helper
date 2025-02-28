"use client";

import { useUser } from "@clerk/nextjs";
import { UserIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { useLayoutInfo } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/_components/useLayoutInfo";
import { useAssignTicket } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/useAssignTicket";
import { AssignSelect } from "@/components/assignSelect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import useKeyboardShortcut from "@/components/useKeyboardShortcut";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

export const AssignPopoverButton = ({ initialAssignedToClerkId }: { initialAssignedToClerkId: string | null }) => {
  const { assignTicket } = useAssignTicket();
  const { setState: setLayoutState } = useLayoutInfo();
  const [showAssignModal, setShowAssignModal] = useState(false);
  const { data: orgMembers = [] } = api.organization.getMembers.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
  const { state: layoutState } = useLayoutInfo();
  const { user: currentUser } = useUser();

  const currentAssignee = orgMembers.find((m) => m.id === initialAssignedToClerkId) ?? null;

  useEffect(() => {
    setAssignedTo(orgMembers.find((m) => m.id === initialAssignedToClerkId) ?? null);
  }, [initialAssignedToClerkId, orgMembers]);

  const toggleAssignModal = (open: boolean) => {
    setShowAssignModal(open);
    if (open) setAssignMessage("");
  };

  useKeyboardShortcut("a", () => {
    toggleAssignModal(true);
  });

  useKeyboardShortcut("i", () => {
    if (!currentUser) return;

    const selfAssignee = {
      id: currentUser.id,
      displayName: currentUser.fullName || currentUser.username || currentUser.id,
    };
    assignTicket(selfAssignee, null);
  });

  const [assignedTo, setAssignedTo] = useState<{ id: string; displayName: string } | null>(null);
  const [assignMessage, setAssignMessage] = useState<string>("");

  return (
    <>
      <Popover open={showAssignModal} onOpenChange={(isOpen) => toggleAssignModal(isOpen)}>
        <PopoverTrigger asChild>
          <button
            className={cn("flex items-center gap-1 hover:underline", !currentAssignee && "text-muted-foreground")}
          >
            <UserIcon className="h-4 w-4" />
            {currentAssignee ? currentAssignee.displayName : "Unassigned"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4">
          <div className="flex flex-col space-y-4">
            <h4 className="font-medium">Assign conversation</h4>
            <AssignSelect selectedUserId={assignedTo?.id} onChange={(assignee) => setAssignedTo(assignee)} />
            <div className="grid gap-1">
              <Label htmlFor="assignMessage">Message</Label>
              <Textarea
                name="assignMessage"
                placeholder="Add an optional reason for assignment..."
                value={assignMessage}
                rows={3}
                onModEnter={() => assignTicket(assignedTo, assignMessage || null)}
                onChange={(e) => setAssignMessage(e.target.value)}
              />
            </div>
            <Button className="w-full" onClick={() => assignTicket(assignedTo, assignMessage || null)}>
              Assign
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
};
