import * as React from "react";

type Props = {
  // bg-foreground or bg-gumroad-pink
  color: "black" | "gumroad-pink";
};

export default function LoadingAnimation({ color }: Props) {
  const baseClasses = `absolute top-1/2 h-2 w-2 -translate-y-1/2 transform rounded-full bg-${color}`;
  return (
    <div className="relative h-4 w-20 overflow-hidden rounded-lg">
      <div className={`${baseClasses} ball-1`}></div>
      <div className={`${baseClasses} ball-2`}></div>
      <div className={`${baseClasses} ball-3`}></div>
      <div className={`${baseClasses} ball-4`}></div>
    </div>
  );
}
