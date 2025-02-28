import { Text, View } from "react-native";
import { Panel } from "@/app/(dashboard)/_components/panel";
import { api } from "@/utils/api";
import { type TimeRange } from "./timeRangeSelector";
import { TrendIndicator } from "./trendIndicator";

export function TopicsTable({ mailboxSlug, timeRange }: { mailboxSlug: string; timeRange: TimeRange }) {
  const { data: topicsData, isLoading } = api.mailbox.topics.list.useQuery(
    { timeRange, mailboxSlug },
    { enabled: !!mailboxSlug },
  );

  const sortedTopicsData = topicsData ? [...topicsData].sort((a, b) => b.count - a.count) : [];

  if (isLoading) {
    return (
      <Panel title="Topics" isSkeleton href={null}>
        <View className="flex-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} className="flex-row items-center py-3">
              <View className="flex-1 h-4 bg-muted rounded" />
              <View className="w-16 h-4 bg-muted rounded ml-4" />
              <View className="w-24 h-4 bg-muted rounded ml-4" />
            </View>
          ))}
        </View>
      </Panel>
    );
  }

  if (!sortedTopicsData.length) {
    return (
      <Panel title="Topics" href={null}>
        <View className="flex-1 items-center justify-center py-8">
          <Text className="text-bright-foreground">No data available.</Text>
        </View>
      </Panel>
    );
  }

  return (
    <Panel title="Topics" href={{ pathname: "/topics", params: { mailboxSlug, timeRange } }}>
      <View className="flex-1 pb-2">
        {sortedTopicsData.slice(0, 5).map((topic) => (
          <View key={topic.id} className="flex-row items-center px-4 h-12">
            <Text className="flex-1 text-foreground">{topic.name}</Text>
            <Text className="w-16 text-right text-foreground tabular-nums">{topic.count.toLocaleString()}</Text>
            <View className="w-24">
              <TrendIndicator trend={topic.trend} />
            </View>
          </View>
        ))}
        {sortedTopicsData.length > 5 && (
          <View className="px-4 h-10 flex-row items-center">
            <Text className="text-muted-foreground tabular-nums">{sortedTopicsData.length - 5} more</Text>
          </View>
        )}
      </View>
    </Panel>
  );
}
