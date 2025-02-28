import { Drawer } from "expo-router/drawer";
import { useColorScheme } from "nativewind";
import React from "react";
import { MailboxProvider } from "@/components/mailboxContext";
import { backgroundColor } from "@/utils/css";
import { Sidebar } from "../_components/sidebar";

export default function IndexLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <MailboxProvider>
      <Drawer
        defaultStatus="closed"
        screenOptions={{
          drawerStyle: {
            backgroundColor: backgroundColor(colorScheme),
          },
          headerShown: false,
        }}
        drawerContent={(props) => <Sidebar {...props} />}
      >
        <Drawer.Screen name="index" options={{ title: "Dashboard", headerShown: false }} />
        <Drawer.Screen name="inbox" options={{ title: "Inbox", headerShown: false }} />
      </Drawer>
    </MailboxProvider>
  );
}
