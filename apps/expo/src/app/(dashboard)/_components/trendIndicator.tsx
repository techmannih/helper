import { Text, View } from "react-native";
import { ArrowTrendingDownIcon, ArrowTrendingUpIcon, MinusIcon } from "react-native-heroicons/outline";
import { cn, cssIconInterop } from "@/utils/css";

cssIconInterop(ArrowTrendingUpIcon);
cssIconInterop(ArrowTrendingDownIcon);
cssIconInterop(MinusIcon);

type TrendProps = {
  trend?: {
    direction: "up" | "down" | "neutral";
    percentageChange: number;
    previousCount?: number;
  } | null;
};

export function TrendIndicator({ trend }: TrendProps) {
  if (!trend) return null;

  return (
    <View className="flex-row items-center justify-end">
      {trend.direction === "up" ? (
        <ArrowTrendingUpIcon className="h-4 w-4 text-success" />
      ) : trend.direction === "down" ? (
        <ArrowTrendingDownIcon className="h-4 w-4 text-destructive" />
      ) : (
        <MinusIcon className="h-4 w-4 text-muted-foreground" />
      )}
      {trend.previousCount && trend.previousCount > 0 ? (
        <Text
          className={cn(
            "ml-1 text-sm",
            trend.direction === "up"
              ? "text-success"
              : trend.direction === "down"
                ? "text-destructive"
                : "text-bright-foreground",
          )}
        >
          {trend.percentageChange.toFixed(1)}%
        </Text>
      ) : null}
    </View>
  );
}
