import { intervalToDuration } from "date-fns";
import { useEffect, useState } from "react";

type HumanizedTimeProps = {
  time: string | Date;
  titlePrefix?: string;
  className?: string;
};

const calculateCurrentTime = (time: Date) => {
  const duration = intervalToDuration({ start: time, end: new Date() });

  if (duration.years && duration.years > 0) return `${duration.years}y`;
  if (duration.months && duration.months > 0) return `${duration.months}mo`;
  if (duration.days && duration.days > 0) return `${duration.days}d`;
  if (duration.hours && duration.hours > 0) return `${duration.hours}h`;
  if (duration.minutes && duration.minutes > 0) return `${duration.minutes}m`;
  return "now";
};

const HumanizedTime = ({ time, titlePrefix, className }: HumanizedTimeProps) => {
  const date = new Date(time);
  const [currentTime, setCurrentTime] = useState<string>(calculateCurrentTime(date));

  const [titleTime, setTitleTime] = useState(date);

  useEffect(() => {
    setCurrentTime(calculateCurrentTime(date));
    setTitleTime(date);

    const timer = setInterval(() => setCurrentTime(calculateCurrentTime(date)), 60000);
    return () => clearInterval(timer);
  }, [time]);

  const longDate = titleTime.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <span className={className} title={titlePrefix ? `${titlePrefix} ${longDate}` : longDate}>
      {currentTime}
    </span>
  );
};

export default HumanizedTime;
