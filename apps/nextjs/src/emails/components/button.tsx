import { Button as BaseButton } from "@react-email/components";
import { cn } from "@/lib/utils";

export const Button = ({
  children,
  className,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  href: string;
}) => {
  return (
    <BaseButton
      className={cn(
        "bg-primary inline-block rounded-lg px-5 py-3 text-center text-sm font-light text-primary-foreground no-underline",
        className,
      )}
      href={href}
    >
      {children}
    </BaseButton>
  );
};
