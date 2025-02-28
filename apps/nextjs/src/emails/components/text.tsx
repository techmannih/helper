import { Text as BaseText } from "@react-email/components";
import { cn } from "@/lib/utils";

export const Text = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  return <BaseText className={cn("text-sm leading-6 text-foreground", className)}>{children}</BaseText>;
};
