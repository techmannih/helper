import { useColorScheme } from "nativewind";
import { useMemo } from "react";
import { XMarkIcon } from "react-native-heroicons/outline";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useAuthenticatedUrl } from "@/components/useGenerateUrl";
import { backgroundColor, cssIconInterop } from "@/utils/css";

cssIconInterop(XMarkIcon);

export default function ProfileView() {
  const { colorScheme } = useColorScheme();
  const url = useAuthenticatedUrl("/mobile/profile");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resolvedUrl = useMemo(() => url?.(), [!!url]);

  if (!resolvedUrl) return null;

  return (
    <SafeAreaProvider>
      <SafeAreaView edges={["top", "bottom"]} className="relative flex-1 bg-background">
        <WebView source={{ uri: resolvedUrl }} style={{ backgroundColor: backgroundColor(colorScheme) }} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
