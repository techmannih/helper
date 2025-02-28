import React from "react";
import { AppSidebar } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/_components/appSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getSidebarInfo } from "../_components/getSidebarInfo";

export default async function MembersLayout(
  props: React.PropsWithChildren<{
    params: Promise<{ mailbox_slug: string }>;
  }>,
) {
  const { mailbox_slug } = await props.params;
  const { children } = props;

  const sidebarInfo = await getSidebarInfo(mailbox_slug);
  return (
    <SidebarProvider>
      <AppSidebar mailboxSlug={mailbox_slug} sidebarInfo={sidebarInfo} />
      <main className="flex flex-col min-h-screen text-foreground w-full">{children}</main>
    </SidebarProvider>
  );
}
