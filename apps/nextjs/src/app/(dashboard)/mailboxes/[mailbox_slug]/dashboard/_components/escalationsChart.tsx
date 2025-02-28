"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, Cell, XAxis, YAxis } from "recharts";
import ConversationsModal from "@/app/(dashboard)/mailboxes/[mailbox_slug]/(inbox)/_components/conversationsModal";
import { timeRangeToQuery } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/dashboard/_components/timeRangeSelector";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { api } from "@/trpc/react";
import { type TimeRange } from "./dashboardContent";
import { generateTimePeriods, type TimePeriod } from "./generateTimePeriods";

export function EscalationsChart({
  mailboxSlug,
  timeRange,
  customDate,
}: {
  mailboxSlug: string;
  timeRange: TimeRange;
  customDate?: Date;
}) {
  const { startDate, period } = useMemo(() => timeRangeToQuery(timeRange, customDate), [timeRange, customDate]);
  const [selectedBar, setSelectedBar] = useState<{ startTime: Date; endTime: Date; label: string } | null>(null);

  const { data, isLoading } = api.mailbox.conversations.escalations.count.useQuery({
    mailboxSlug,
    startDate,
    period,
  });

  const { data: selectedConversations, isLoading: isLoadingConversations } = api.mailbox.conversations.list.useQuery(
    {
      mailboxSlug,
      status: ["escalated"],
      createdAfter: selectedBar ? selectedBar.startTime.toISOString() : startDate.toISOString(),
      createdBefore: selectedBar ? selectedBar.endTime.toISOString() : startDate.toISOString(),
    },
    { enabled: !!selectedBar },
  );

  if (isLoading || !data) {
    return <div className="w-full h-full flex items-center justify-center">Loading...</div>;
  }
  if (!data.length) {
    return <div className="w-full h-full flex items-center justify-center">No data available.</div>;
  }

  const chartData = generateTimePeriods(period, startDate, () => ({ resolved: 0, pending: 0 }));
  data.forEach(({ timePeriod, pending, count }) => {
    if (chartData[timePeriod]) chartData[timePeriod][pending ? "pending" : "resolved"] = count;
  });

  const chartConfig = {
    resolved: {
      label: "Resolved",
      color: "hsl(var(--success))",
    },
    pending: {
      label: "Pending",
      color: "hsl(var(--bright))",
    },
  };

  const handleBarClick = (data: TimePeriod<any>) => {
    if (!data.startTime) return;
    setSelectedBar({
      startTime: data.startTime,
      endTime: data.endTime,
      label: data.label,
    });
  };

  return (
    <>
      <ChartContainer config={chartConfig} className="h-[300px]">
        <BarChart data={Object.values(chartData)} barGap={16}>
          <XAxis dataKey="label" axisLine={false} tickLine={false} />
          <YAxis domain={[0, "auto"]} axisLine={false} tickLine={false} />
          <ChartTooltip position={{ y: 0 }} content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar
            stackId="escalations"
            dataKey="resolved"
            fill="var(--color-resolved)"
            maxBarSize={32}
            radius={[4, 4, 0, 0]}
          >
            {Object.values(chartData).map((entry, index) =>
              entry.pending > 0 ? <Cell key={`cell-${index}`} radius={0} /> : <Cell key={`cell-${index}`} />,
            )}
          </Bar>
          <Bar
            stackId="escalations"
            dataKey="pending"
            fill="var(--color-pending)"
            maxBarSize={32}
            radius={[4, 4, 0, 0]}
            onClick={(data) => handleBarClick(data)}
            className="cursor-pointer hover:opacity-90 transition-opacity duration-100"
          />
        </BarChart>
      </ChartContainer>

      <ConversationsModal
        open={!!selectedBar}
        onOpenChange={(open) => !open && setSelectedBar(null)}
        mailboxSlug={mailboxSlug}
        title={`Escalations - ${selectedBar?.label}`}
        conversations={selectedConversations?.conversations ?? []}
        isLoading={isLoadingConversations}
      />
    </>
  );
}
