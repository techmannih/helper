import { currentUser } from "@clerk/nextjs/server";
import { api } from "@/trpc/server";

export const getSidebarInfo = async (mailboxSlug: string) => {
  const [user, countByStatus, mailboxes, { trialInfo }] = await Promise.all([
    currentUser(),
    api.mailbox.countByStatus({ mailboxSlug }),
    api.mailbox.list(),
    api.organization.getOnboardingStatus(),
  ]);

  const currentMailbox = mailboxes.find((m) => m.slug === mailboxSlug);
  const loggedInName = user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress;
  const loggedInEmail = user?.primaryEmailAddress?.emailAddress;
  const avatarName = loggedInEmail || loggedInName;

  return { countByStatus, mailboxes, currentMailbox, loggedInName, loggedInEmail, avatarName, trialInfo };
};

export type SidebarInfo = Awaited<ReturnType<typeof getSidebarInfo>>;
