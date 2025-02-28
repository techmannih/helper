import { Ionicons } from "@expo/vector-icons";
import { subDays, subHours } from "date-fns";
import { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export type TimeRange = "24h" | "7d" | "30d" | "1y";

export const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: "24h", label: "Last 24 Hours" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "1y", label: "Last 1 Year" },
];

type Props = {
  value: TimeRange;
  onValueChange: (value: TimeRange) => void;
};

export function TimeRangeSelector({ value, onValueChange }: Props) {
  const [showDropdown, setShowDropdown] = useState(false);
  const selectedOption = timeRangeOptions.find((option) => option.value === value);

  return (
    <View className="relative w-40">
      <TouchableOpacity
        className="flex-row items-center justify-end gap-1 px-3 py-1.5 rounded"
        onPress={() => setShowDropdown(!showDropdown)}
      >
        <Text className="text-foreground">{selectedOption?.label}</Text>
        <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} className="text-foreground" size={16} />
      </TouchableOpacity>

      {showDropdown && (
        <View className="absolute top-full right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-10">
          {timeRangeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              className="px-4 py-2 border-b border-border last:border-b-0"
              onPress={() => {
                onValueChange(option.value);
                setShowDropdown(false);
              }}
            >
              <Text className="text-foreground">{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

export function timeRangeToQuery(timeRange: TimeRange) {
  const now = new Date();
  switch (timeRange) {
    case "24h":
      return { startDate: subHours(now, 24), period: "hourly" as const };
    case "7d":
      return { startDate: subDays(now, 7), period: "daily" as const };
    case "30d":
      return { startDate: subDays(now, 30), period: "daily" as const };
    case "1y":
      return { startDate: subDays(now, 365), period: "daily" as const };
  }
}
