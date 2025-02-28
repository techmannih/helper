import * as Ably from "ably";
import { useChannel } from "ably/react";
import SuperJSON from "superjson";

export const useAblyEvent = (channel: string, event: string, callback: (message: Ably.Message) => void) => {
  useChannel(channel, event, (message) => callback({ ...message, data: SuperJSON.parse(message.data) }));
};
