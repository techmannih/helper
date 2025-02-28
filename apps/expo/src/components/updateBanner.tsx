import * as Updates from "expo-updates";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { InformationCircleIcon, XMarkIcon } from "react-native-heroicons/outline";
import { SafeAreaView } from "react-native-safe-area-context";
import { cssIconInterop } from "@/utils/css";

cssIconInterop(XMarkIcon);
cssIconInterop(InformationCircleIcon);

export function UpdateBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    if (__DEV__) return;

    async function checkForUpdates() {
      if (isChecking) return;

      try {
        setIsChecking(true);
        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          setShowBanner(true);
        }
      } catch (error) {
        console.error("Error checking for updates:", error);
      } finally {
        setIsChecking(false);
      }
    }

    const interval = setInterval(checkForUpdates, 60 * 60 * 1000);
    void checkForUpdates();

    return () => clearInterval(interval);
  }, [isChecking]);

  if (!showBanner) return null;

  return (
    <View className="absolute bottom-0 left-0 right-0 px-4 py-3 z-50">
      <SafeAreaView edges={["bottom"]}>
        <View className="bg-background rounded shadow">
          <View className="bg-muted pl-4 z-50 flex-row items-center justify-between gap-2 rounded">
            <InformationCircleIcon className="w-5 h-5 text-foreground" />
            <Text className="text-white flex-1">Update available</Text>
            <Pressable onPress={() => Updates.reloadAsync()} className="px-3 py-2 rounded-md bg-bright">
              <Text className="text-bright-foreground">Reload</Text>
            </Pressable>
            <Pressable onPress={() => setShowBanner(false)} className="p-4 pl-2">
              <Text className="text-foreground">Later</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
