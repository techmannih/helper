import { UserIcon } from "@heroicons/react/24/outline";
import type { CommandGroup } from "./types";

type AssigneesPageProps = {
  orgMembers: { id: string; displayName: string }[] | undefined;
  currentUserId: string | undefined;
  onAssignTicket?: (assignedTo: { id: string; displayName: string } | null) => void;
  onOpenChange: (open: boolean) => void;
};

export const useAssigneesPage = ({
  orgMembers,
  currentUserId,
  onAssignTicket,
  onOpenChange,
}: AssigneesPageProps): CommandGroup[] => [
  {
    heading: "Assignees",
    items: [
      {
        id: "unassign",
        label: "Unassign",
        icon: UserIcon,
        onSelect: () => {
          if (onAssignTicket) {
            onAssignTicket(null);
            onOpenChange(false);
          }
        },
        preview: (
          <div className="p-4">
            <h3 className="font-medium mb-2">Unassign Ticket</h3>
            <p className="text-sm text-muted-foreground">Remove the current assignee from this conversation.</p>
          </div>
        ),
      },
      ...(orgMembers?.map((member) => ({
        id: member.id,
        label: `${member.displayName}${member.id === currentUserId ? " (You)" : ""}`,
        icon: UserIcon,
        onSelect: () => {
          if (onAssignTicket) {
            onAssignTicket(member);
            onOpenChange(false);
          }
        },
        preview: (
          <div className="p-4">
            <h3 className="font-medium mb-2">Assign to {member.displayName}</h3>
            <p className="text-sm text-muted-foreground">
              Transfer ownership of this conversation to {member.displayName}.
            </p>
          </div>
        ),
      })) || []),
    ],
  },
];
