"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { type TimeRange } from "./dashboardContent";
import { TopicDetailsDialog } from "./topicDetailsDialog";
import { TrendIndicator } from "./trendIndicator";

type Props = {
  currentMailbox: { name: string; slug: string };
  timeRange: TimeRange;
  customDate?: Date;
};

export const TopicsTable = ({ currentMailbox, timeRange, customDate }: Props) => {
  const [selectedTopic, setSelectedTopic] = useState<{ id: number; name: string } | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const { data: topicsData, isLoading } = api.mailbox.topics.list.useQuery(
    { timeRange: timeRange === "custom" ? "24h" : timeRange, mailboxSlug: currentMailbox.slug, customDate },
    { enabled: !!currentMailbox.slug },
  );

  const sortedTopicsData = topicsData ? [...topicsData].sort((a, b) => b.count - a.count) : [];
  const showTrend = timeRange !== "1y";

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Topic</TableHead>
              <TableHead>Count</TableHead>
              {showTrend && <TableHead>Trend</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
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
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {sortedTopicsData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead>Count</TableHead>
                {showTrend && <TableHead>Trend</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTopicsData.map((topic) => (
                <TableRow
                  key={topic.id}
                  onClick={() => setSelectedTopic({ id: topic.id, name: topic.name })}
                  onMouseEnter={() => setHoveredId(topic.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={cn(
                    "cursor-pointer transition-colors duration-200",
                    hoveredId === topic.id ? "bg-muted hover:bg-muted" : "hover:bg-muted/50",
                  )}
                >
                  <TableCell>{topic.name}</TableCell>
                  <TableCell>{formatNumber(topic.count)}</TableCell>
                  {showTrend && (
                    <TableCell>
                      <TrendIndicator trend={topic.trend} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div>No data available.</div>
        )}
      </div>

      <TopicDetailsDialog
        topic={selectedTopic}
        open={!!selectedTopic}
        onOpenChange={(open) => !open && setSelectedTopic(null)}
        timeRange={timeRange}
        currentMailbox={currentMailbox}
      />
    </>
  );
};
