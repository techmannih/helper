/**
 * @vitest-environment jsdom
 */

import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

import Conversation from "@/components/widget/Conversation";

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    data: undefined,
    setData: vi.fn(),
    messages: [],
    input: "",
    handleInputChange: vi.fn(),
    handleSubmit: vi.fn(),
    append: vi.fn(),
    setMessages: vi.fn(),
    status: "ready",
    stop: vi.fn(),
    addToolResult: vi.fn(),
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false })),
}));

vi.mock("@/components/widget/useNewConversation", () => ({
  useNewConversation: () => ({
    conversationSlug: null,
    setConversationSlug: vi.fn(),
    createConversation: vi.fn(),
  }),
}));

vi.mock("@/components/widget/useWidgetView", () => ({
  useWidgetView: () => ({ setIsNewConversation: vi.fn() }),
}));

vi.mock("@/lib/realtime/hooks", () => ({
  DISABLED: "DISABLED",
  useRealtimeEvent: vi.fn(),
}));

vi.mock("@/lib/shared/sentry", () => ({ captureExceptionAndLog: vi.fn() }));
vi.mock("@/lib/widget/messages", () => ({ sendConversationUpdate: vi.fn() }));

vi.mock("@/components/widget/MessagesList", () => ({
  default: () => <div data-testid="messages-list" />,
}));

vi.mock("@/components/widget/SupportButtons", () => ({ default: () => null }));
vi.mock("@/components/widget/MessagesSkeleton", () => ({ default: () => null }));

vi.mock("@/components/widget/ChatInput", () => ({
  default: ({ inputRef }: { inputRef: React.RefObject<HTMLTextAreaElement> }) => (
    <textarea ref={inputRef} data-testid="chat-input" />
  ),
}));

describe("Conversation", () => {
  it("focuses input when selected conversation changes", () => {
    const { rerender } = render(
      <Conversation
        token="test"
        isGumroadTheme={false}
        selectedConversationSlug="slug-a"
        onLoadFailed={() => {}}
        guideEnabled={false}
        resumeGuide={null}
        currentView="chat"
      />,
    );

    const input = screen.getByTestId("chat-input");
    expect(document.activeElement).toBe(input);

    input.blur();
    expect(document.activeElement).not.toBe(input);

    rerender(
      <Conversation
        token="test"
        isGumroadTheme={false}
        selectedConversationSlug="slug-b"
        onLoadFailed={() => {}}
        guideEnabled={false}
        resumeGuide={null}
        currentView="chat"
      />,
    );

    expect(document.activeElement).toBe(screen.getByTestId("chat-input"));
  });
});

