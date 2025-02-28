import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";
import { api, RouterOutputs } from "@/utils/api";

const MAILBOX_STORAGE_KEY = "selected_mailbox";

type MailboxContextType = {
  mailboxes: RouterOutputs["mailbox"]["list"] | null;
  selectedMailbox: RouterOutputs["mailbox"]["list"][number] | null;
  setSelectedMailbox: (slug: string) => void;
};

const MailboxContext = createContext<MailboxContextType | undefined>(undefined);

export function MailboxProvider({ children }: { children: React.ReactNode }) {
  const [selectedMailboxState, setSelectedMailboxState] = useState<string | null>(null);
  const { data: mailboxes } = api.mailbox.list.useQuery();

  useEffect(() => {
    if (!mailboxes?.length || selectedMailboxState) return;

    SecureStore.getItemAsync(MAILBOX_STORAGE_KEY).then((savedMailbox) => {
      if (savedMailbox && mailboxes.find((m) => m.slug === savedMailbox)) {
        setSelectedMailboxState(savedMailbox);
      } else {
        setSelectedMailboxState(mailboxes[0].slug);
      }
    });
  }, [mailboxes, selectedMailboxState]);

  const setSelectedMailbox = async (slug: string) => {
    setSelectedMailboxState(slug);
    await SecureStore.setItemAsync(MAILBOX_STORAGE_KEY, slug);
  };

  const selectedMailbox = mailboxes?.find((m) => m.slug === selectedMailboxState) ?? null;

  useEffect(() => {
    if (selectedMailboxState && !selectedMailbox) setSelectedMailboxState(null);
  }, [selectedMailbox, selectedMailboxState]);

  return (
    <MailboxContext.Provider
      value={{
        mailboxes: mailboxes ?? null,
        selectedMailbox,
        setSelectedMailbox,
      }}
    >
      {children}
    </MailboxContext.Provider>
  );
}

export function useMailbox() {
  const context = useContext(MailboxContext);
  if (context === undefined) {
    throw new Error("useMailbox must be used within a MailboxProvider");
  }
  return context;
}
