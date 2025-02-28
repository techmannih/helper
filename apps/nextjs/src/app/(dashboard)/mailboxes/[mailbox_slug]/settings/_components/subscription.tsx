import { useSearchParams } from "next/navigation";
import { useState } from "react";
import SectionWrapper from "@/app/(dashboard)/mailboxes/[mailbox_slug]/settings/_components/sectionWrapper";
import type { Subscription as SubscriptionType } from "@/app/types/global";
import { toast } from "@/components/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useRunOnce } from "@/components/useRunOnce";
import { handleSuccessfulSubscription, subscribeToHelper, unsubscribeFromHelper } from "@/serverActions/subscription";

const Subscription = ({
  subscription,
  mailboxSlug,
}: {
  subscription: SubscriptionType | null;
  mailboxSlug: string;
}) => {
  const searchParams = useSearchParams();
  const [isSubscribed, setIsSubscribed] = useState(subscription?.canceledAt === null);

  useRunOnce(() => {
    const status = searchParams.get("stripeStatus");
    const stripeSessionId = searchParams.get("stripeSessionId");
    if (status === "success" && stripeSessionId) {
      handleSuccessfulSubscription(stripeSessionId).then((res) => {
        setIsSubscribed(res.success);
        if (res.success) {
          toast({
            title: res.message,
            variant: "success",
          });
        } else {
          toast({
            title: res.message,
            variant: "destructive",
          });
        }
      });
    }
  });

  const handleSubscriptionAction = async () => {
    if (isSubscribed && subscription?.stripeSubscriptionId) {
      if (!confirm("Are you sure you want to unsubscribe?")) return;
      const result = await unsubscribeFromHelper({ mailboxSlug });
      if (result.success) {
        setIsSubscribed(false);
        toast({
          title: result.message,
          variant: "success",
        });
      } else {
        toast({
          title: result.message,
          variant: "destructive",
        });
      }
    } else {
      await subscribeToHelper({ mailboxSlug });
    }
  };

  return (
    <SectionWrapper title="Subscription" description="Manage your Helper subscription">
      <Button variant={isSubscribed ? "destructive_outlined" : "subtle"} onClick={handleSubscriptionAction}>
        {isSubscribed ? "Cancel subscription" : "Subscribe"}
      </Button>
    </SectionWrapper>
  );
};

export default Subscription;
