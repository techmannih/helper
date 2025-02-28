import { useLocalSearchParams, useRouter } from "expo-router";
import { useColorScheme } from "nativewind";
import { useMemo } from "react";
import { TouchableOpacity, View } from "react-native";
import { XMarkIcon } from "react-native-heroicons/outline";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useAuthenticatedUrl } from "@/components/useGenerateUrl";
import { backgroundColor, cssIconInterop } from "@/utils/css";

cssIconInterop(XMarkIcon);

export default function ConversationView() {
  const { colorScheme } = useColorScheme();
  const router = useRouter();
  const { id, mailboxSlug } = useLocalSearchParams<{ id: string; mailboxSlug: string }>();

  const url = useAuthenticatedUrl(`/mailboxes/${mailboxSlug}/conversations?id=${id}`);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resolvedUrl = useMemo(() => url?.(), [!!url]);

  if (!resolvedUrl) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={["top", "bottom"]} className="relative flex-1 bg-background">
        <WebView source={{ uri: resolvedUrl }} style={{ backgroundColor: backgroundColor(colorScheme) }} />
        <View className="absolute top-0 left-0 w-12 h-12 bg-background" />
        <TouchableOpacity
          className="absolute top-0 left-0 w-14 h-14 flex items-center justify-center"
          onPress={() => router.back()}
        >
          <XMarkIcon className="w-6 h-6 text-foreground" />
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
