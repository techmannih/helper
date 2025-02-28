import { BoltIcon, XCircleIcon } from "@heroicons/react/24/outline";
import type { Message } from "@/app/types/global";
import HumanizedTime from "@/components/humanizedTime";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ToolMetadata } from "@/db/schema/conversationMessages";

export const ToolEvent = ({ message }: { message: Message & { metadata: ToolMetadata } }) => {
  const tool = message.metadata.tool;
  const parameters = message.metadata.parameters;
  const isSuccess = message.metadata.success;
  const apiResult = JSON.stringify(message.metadata.result, null, 2);
  const Icon = isSuccess ? BoltIcon : XCircleIcon;

  return (
    <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span>
        {tool.name}
        {isSuccess ? "" : " failed"}
      </span>
      <span></span>

      <Tooltip>
        <TooltipTrigger asChild>
          <button className="cursor-help decoration-dotted underline">Details</button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xl bg-background text-foreground" sideOffset={5}>
          <div className="flex flex-col gap-2">
            {isSuccess ? (
              <>
                <div>
                  <div>
                    <strong>Tool description</strong>
                  </div>
                  <div>{tool.description}</div>
                </div>
                <div>
                  <div>
                    <strong>Result</strong>
                  </div>
                  <div>{message.body}</div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div>
                    <strong>Request</strong>
                  </div>
                  <div>
                    {tool.requestMethod} {tool.url}
                  </div>
                </div>
              </>
            )}
            <div>
              <div>
                <strong>Parameters</strong>
              </div>
              <div>
                {Object.entries(parameters).map(([key, value]) => (
                  <div key={key} className="flex gap-1">
                    <span>{key}:</span>
                    <span className="truncate font-mono" title={value as string}>
                      {value as string}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div>
                <strong>Tool response</strong>
              </div>
              <div className="font-mono">{apiResult}</div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
      <span>·</span>
      <span>
        <HumanizedTime time={message.createdAt} />
      </span>
    </div>
  );
};
