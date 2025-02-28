import { eachDayOfInterval, eachHourOfInterval, format } from "date-fns";

export type TimePeriod<T> = {
  startTime: Date;
  endTime: Date;
  label: string;
} & T;

export function generateTimePeriods<T>(
  period: "hourly" | "daily",
  startDate: Date,
  defaultValue: () => T,
): Record<string, TimePeriod<T>> {
  const now = new Date();
  const dates =
    period === "hourly"
      ? eachHourOfInterval({ start: startDate, end: now })
      : eachDayOfInterval({ start: startDate, end: now });

  const result: Record<string, TimePeriod<T>> = {};
  dates.forEach((date) => {
    const endTime =
      period === "hourly" ? new Date(date.getTime() + 60 * 60 * 1000) : new Date(date.getTime() + 24 * 60 * 60 * 1000);

    const label =
      period === "hourly"
        ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
        : date.toLocaleDateString(undefined, { month: "2-digit", day: "2-digit" });

    const key = period === "hourly" ? format(date, "yyyy-MM-dd HH:00:00") : format(date, "yyyy-MM-dd");

    result[key] = {
      startTime: date,
      endTime,
      label,
      ...defaultValue(),
    };
  });

  return result;
}
