import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { CheckIcon, FlagIcon } from "react-native-heroicons/solid";
import { CartesianChart, StackedBar } from "victory-native";
import { generateTimePeriods } from "@/app/(dashboard)/_components/generateTimePeriods";
import { Panel } from "@/app/(dashboard)/_components/panel";
import { api } from "@/utils/api";
import { cssIconInterop } from "@/utils/css";
import { timeRangeToQuery, type TimeRange } from "./timeRangeSelector";

cssIconInterop(CheckIcon);
cssIconInterop(FlagIcon);

export function EscalationsChart({ mailboxSlug, timeRange }: { mailboxSlug: string; timeRange: TimeRange }) {
  const { startDate, period } = useMemo(() => timeRangeToQuery(timeRange), [timeRange]);

  const { data, isLoading } = api.mailbox.conversations.escalations.count.useQuery({
    mailboxSlug,
    startDate,
    period,
  });

  const chartData = generateTimePeriods(period, startDate, () => ({ resolved: 0, pending: 0 }));
  data?.forEach(({ timePeriod, pending, count }) => {
    if (chartData[timePeriod]) {
      if (pending) {
        chartData[timePeriod].pending = count;
      } else {
        chartData[timePeriod].resolved = count;
      }
    }
  });

  const formattedData = Object.entries(chartData).map(([_, item]) => ({
    label: item.label,
    resolved: Number(item.resolved),
    pending: Number(item.pending),
  }));

  const totalResolved = data?.reduce((acc, { pending, count }) => acc + (!pending ? count : 0), 0) ?? 0;
  const totalPending = data?.reduce((acc, { pending, count }) => acc + (pending ? count : 0), 0) ?? 0;

  return (
    <Panel
      title="Escalations"
      action={
        data && data.length > 0 ? (
          <>
            <FlagIcon className="h-4 w-4 text-bright" />
            <Text className="text-sm text-bright">{totalPending}</Text>
            <CheckIcon className="h-4 w-4 text-success" />
            <Text className="text-sm text-success">{totalResolved}</Text>
          </>
        ) : null
      }
      href={{ pathname: "/conversations", params: { category: "escalations", mailboxSlug } }}
      isSkeleton={isLoading}
    >
      <View className="p-4">
        {data && data.length > 0 ? (
          <View className="h-[100px]">
            <CartesianChart
              data={formattedData}
              xKey="label"
              yKeys={["resolved", "pending"]}
              domainPadding={0}
              axisOptions={{ lineColor: "transparent" }}
              frame={{ lineColor: "transparent" }}
            >
              {({ points, chartBounds }) => (
                <StackedBar
                  innerPadding={timeRange === "7d" ? 0.3 : 0.1}
                  chartBounds={chartBounds}
                  points={[points.resolved, points.pending]}
                  colors={["#22c55e", "#fbbf24"]}
                  barOptions={({ isTop }) => ({
                    roundedCorners: isTop ? { topLeft: 4, topRight: 4 } : undefined,
                  })}
                />
              )}
            </CartesianChart>
          </View>
        ) : (
          <View className="mb-4 items-center justify-center">
            {isLoading ? (
              <View className="w-48 h-4 rounded bg-muted" />
            ) : (
              <Text className="text-muted-foreground">No data available.</Text>
            )}
          </View>
        )}
      </View>
    </Panel>
  );
}
