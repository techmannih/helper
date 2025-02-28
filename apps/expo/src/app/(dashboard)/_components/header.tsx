import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useNavigation } from "expo-router";
import React from "react";
import { Text, TouchableOpacity } from "react-native";
import { ChevronUpDownIcon, UserCircleIcon } from "react-native-heroicons/outline";
import { useMailbox } from "@/components/mailboxContext";
import { Avatar } from "@/components/ui/avatar";
import { cssIconInterop } from "@/utils/css";

cssIconInterop(ChevronUpDownIcon);

export function Header() {
  const { selectedMailbox } = useMailbox();
  const navigation = useNavigation<DrawerNavigationProp<any>>();

  if (!selectedMailbox) return null;

  return (
    <TouchableOpacity onPress={() => navigation.openDrawer()} className="flex-row items-center gap-2 px-6">
      <Avatar name={selectedMailbox.name} />
      <Text className="text-2xl font-bold flex-1 text-foreground">{selectedMailbox.name}</Text>
      <UserCircleIcon size={24} className="text-foreground" />
    </TouchableOpacity>
  );
}
