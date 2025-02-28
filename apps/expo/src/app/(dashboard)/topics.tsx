import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { ChevronDownIcon, ChevronUpIcon } from "react-native-heroicons/outline";
import { SafeAreaView } from "react-native-safe-area-context";
import { api, RouterOutputs } from "@/utils/api";
import { cn, cssIconInterop } from "@/utils/css";
import { type TimeRange } from "./_components/timeRangeSelector";
import { TrendIndicator } from "./_components/trendIndicator";

cssIconInterop(ChevronDownIcon);
cssIconInterop(ChevronUpIcon);

function TopicItem({
  topic,
  timeRange,
  mailboxSlug,
}: {
  topic: RouterOutputs["mailbox"]["topics"]["list"][number];
  timeRange: TimeRange;
  mailboxSlug: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: topicDetails, isLoading } = api.mailbox.topics.getDetails.useQuery(
    {
      topicId: topic.id,
      timeRange,
      mailboxSlug,
    },
    { enabled: isExpanded },
  );

  return (
    <View>
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        className={cn("flex-row items-center justify-between p-6", !isExpanded && "border-b border-border")}
      >
        <View className="flex-1">
          <Text className="text-foreground font-medium text-lg">{topic.name}</Text>
          <Text className="text-muted-foreground text-sm">{topic.count.toLocaleString()} conversations</Text>
        </View>
        <View className="flex-row items-center gap-4">
          <TrendIndicator trend={topic.trend} />
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDownIcon className="h-5 w-5 text-muted-foreground" />
          )}
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View className="px-6 pb-6 border-b border-border">
          {isLoading ? (
            <View className="w-48 h-4 bg-muted rounded" />
          ) : topicDetails?.subtopics?.length ? (
            <View className="flex flex-col gap-4">
              {topicDetails?.subtopics?.map((subtopic) => (
                <SubtopicItem key={subtopic.id} subtopic={subtopic} mailboxSlug={mailboxSlug} />
              ))}
            </View>
          ) : (
            <Text className="text-muted-foreground">No subtopics found</Text>
          )}
        </View>
      )}
    </View>
  );
}

function SubtopicItem({
  subtopic,
  mailboxSlug,
}: {
  subtopic: RouterOutputs["mailbox"]["topics"]["getDetails"]["subtopics"][number];
  mailboxSlug: string;
}) {
  const router = useRouter();
  const { data: questions, isLoading } = api.mailbox.topics.getExampleQuestions.useQuery({
    subtopicId: subtopic.id,
    mailboxSlug,
  });

  return (
    <TouchableOpacity
      className="flex flex-col gap-3"
      onPress={() =>
        router.push({
          pathname: `/(dashboard)/conversations`,
          params: { mailboxSlug, topicId: subtopic.id },
        })
      }
    >
      <View className="flex-row justify-between items-center">
        <Text className="text-foreground font-medium">{subtopic.name}</Text>
        <View className="flex-row items-center gap-4">
          <Text className="text-muted-foreground">{subtopic.count.toLocaleString()}</Text>
          <TrendIndicator trend={subtopic.trend} />
        </View>
      </View>
      <View className="flex flex-col gap-2 pl-6">
        {isLoading ? (
          <View className="w-48 h-4 bg-muted rounded" />
        ) : (
          questions?.map((question, i) => (
            <Text key={i} className="text-sm text-muted-foreground">
              {question}
            </Text>
          ))
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function TopicsScreen() {
  const { mailboxSlug, timeRange } = useLocalSearchParams<{ mailboxSlug: string; timeRange: TimeRange }>();

  const { data: topicsData, isLoading } = api.mailbox.topics.list.useQuery(
    { timeRange, mailboxSlug },
    { enabled: !!mailboxSlug },
  );

  const sortedTopicsData = topicsData ? [...topicsData].sort((a, b) => b.count - a.count) : [];

  if (!mailboxSlug) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Invalid mailbox</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background">
      {isLoading ? (
        <View className="flex flex-col gap-4 px-6 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} className="bg-muted rounded-lg h-20" />
          ))}
        </View>
      ) : !sortedTopicsData.length ? (
        <Text className="text-muted-foreground text-center py-8">No topics available</Text>
      ) : (
        sortedTopicsData.map((topic) => (
          <TopicItem key={topic.id} topic={topic} timeRange={timeRange} mailboxSlug={mailboxSlug} />
        ))
      )}
    </ScrollView>
  );
}
