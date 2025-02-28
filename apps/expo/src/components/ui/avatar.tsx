import { Text, View } from "react-native";

export function Avatar({ name }: { name: string }) {
  return (
    <View className="h-8 w-8 rounded-full items-center justify-center bg-bright">
      <Text className="text-xs font-bold uppercase text-bright-foreground">{name.slice(0, 2)}</Text>
    </View>
  );
}
