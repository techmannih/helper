export const WorkflowActions = {
  CLOSE_TICKET: "close_ticket",
  MARK_SPAM: "mark_spam",
  REPLY_AND_CLOSE_TICKET: "reply_and_close_ticket",
  REPLY_AND_ESCALATE_TO_SLACK: "reply_and_escalate_to_slack",
  ASSIGN_USER: "assign_user",
  UNKNOWN: "unknown",
} as const;

export type WorkflowAction = (typeof WorkflowActions)[keyof typeof WorkflowActions];

export type WorkflowActionInfo = {
  action: WorkflowAction;
  message?: string | null;
  slackChannelId?: string;
  assignedUserId?: string;
};
