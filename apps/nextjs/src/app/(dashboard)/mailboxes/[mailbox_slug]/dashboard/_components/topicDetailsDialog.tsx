"use client";

import { skipToken } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bar, BarChart, LabelList, XAxis } from "recharts";
import ConversationsModal from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/conversationsModal";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import { api } from "@/trpc/react";
import { type TimeRange } from "./dashboardContent";
import { TimeRangeSelector, timeRangeToQuery } from "./timeRangeSelector";
import { TrendIndicator } from "./trendIndicator";

type Props = {
  topic: { id: number; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timeRange: TimeRange;
  currentMailbox: { slug: string };
};

const chartConfig = {
  count: {
    label: "Conversations",
    color: "hsl(var(--chart-1))",
  },
};

export function TopicDetailsDialog({ topic, open, onOpenChange, timeRange: initialTimeRange, currentMailbox }: Props) {
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);
  const { startDate, endDate } = useMemo(() => timeRangeToQuery(timeRange), [timeRange]);
  const [selectedSubtopicForConversations, setSelectedSubtopicForConversations] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const { data: topicDetails, isLoading } = api.mailbox.topics.getDetails.useQuery(
    {
      topicId: topic?.id ?? 0,
      timeRange: timeRange === "custom" ? "24h" : timeRange,
      mailboxSlug: currentMailbox.slug,
    },
    { enabled: open && !!topic },
  );

  const { data, isLoading: isLoadingConversations } = api.mailbox.conversations.list.useQuery(
    selectedSubtopicForConversations
      ? {
          topic: [selectedSubtopicForConversations.id],
          createdAfter: startDate.toISOString(),
          createdBefore: endDate.toISOString(),
          mailboxSlug: currentMailbox.slug,
        }
      : skipToken,
  );

  const showTrend = timeRange !== "1y";

  if (!topic || !open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] w-[1400px] max-h-[85vh] flex flex-col">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle className="text-2xl font-bold">{topic.name}</DialogTitle>
            <TimeRangeSelector value={timeRange} onValueChange={setTimeRange} />
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-6">
            <Panel title="Conversation Volume">
              <div className="h-[400px]">
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : (
                  <ChartContainer className="h-[400px]" config={chartConfig}>
                    <BarChart data={topicDetails?.volumeData ?? []} accessibilityLayer>
                      <XAxis
                        dataKey="date"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={10}
                        tickFormatter={(value) => {
                          const date = new Date(value);
                          return date.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          });
                        }}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            hideLabel
                            className="w-[150px]"
                            nameKey="count"
                            labelFormatter={(value) => {
                              return new Date(value).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              });
                            }}
                          />
                        }
                      />
                      <Bar dataKey="count" fill="var(--color-count)" radius={4}>
                        <LabelList
                          position="top"
                          offset={12}
                          className="fill-foreground"
                          fontSize={12}
                          formatter={(value: number) => formatNumber(value)}
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </div>
            </Panel>

            <Card className="bg-black/25">
              <CardHeader>
                <CardTitle>Subtopics</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subtopic</TableHead>
                        <TableHead>Count</TableHead>
                        {showTrend && <TableHead>Trend</TableHead>}
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Skeleton className="h-4 w-[200px]" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-4 w-[60px]" />
                          </TableCell>
                          {showTrend && (
                            <TableCell>
                              <Skeleton className="h-4 w-[140px]" />
                            </TableCell>
                          )}
                          <TableCell>
                            <Skeleton className="h-4 w-[100px]" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subtopic</TableHead>
                        <TableHead>Count</TableHead>
                        {showTrend && <TableHead>Trend</TableHead>}
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topicDetails?.subtopics.map((subtopic) => (
                        <TableRow key={subtopic.id}>
                          <TableCell>
                            <div className="space-y-2">
                              <div>{subtopic.name}</div>
                              <ExampleQuestions subtopicId={subtopic.id} mailboxSlug={currentMailbox.slug} />
                            </div>
                          </TableCell>
                          <TableCell>{formatNumber(subtopic.count)}</TableCell>
                          {showTrend && (
                            <TableCell>
                              <TrendIndicator trend={subtopic.trend} />
                            </TableCell>
                          )}
                          <TableCell>
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto whitespace-nowrap p-2"
                              onClick={() =>
                                setSelectedSubtopicForConversations({
                                  id: subtopic.id,
                                  name: subtopic.name,
                                })
                              }
                            >
                              View conversations
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      <ConversationsModal
        open={!!selectedSubtopicForConversations}
        onOpenChange={(open: boolean) => !open && setSelectedSubtopicForConversations(null)}
        mailboxSlug={currentMailbox.slug}
        title={`Conversations - ${selectedSubtopicForConversations?.name} (last 30)`}
        conversations={data?.conversations ?? []}
        isLoading={isLoadingConversations}
      />
    </>
  );
}

function ExampleQuestions({ subtopicId, mailboxSlug }: { subtopicId: number; mailboxSlug: string }) {
  const { data: questions, isLoading } = api.mailbox.topics.getExampleQuestions.useQuery({
    subtopicId,
    mailboxSlug,
  });

  if (isLoading) {
    return (
      <div className="space-y-1">
        <Skeleton className="h-3 w-[200px]" />
        <Skeleton className="h-3 w-[180px]" />
        <Skeleton className="h-3 w-[160px]" />
      </div>
    );
  }

  if (!questions) return null;

  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      {questions.map((question, i) => (
        <div key={i} className="flex items-start gap-2">
          <div>{question}</div>
        </div>
      ))}
    </div>
  );
}
