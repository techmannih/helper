declare global {
  interface OrganizationPrivateMetadata {
    styleLinterEnabled?: boolean;
    automatedRepliesCount?: number;
    automatedRepliesLimitExceededAt?: string;
    freeTrialEndsAt?: string;
    trialExpiredNotificationSentAt?: string;
  }
}
