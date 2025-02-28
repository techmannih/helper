import { useState } from "react";

type View = "chat" | "previous";

export function useWidgetView() {
  const [currentView, setCurrentView] = useState<View>("chat");
  const [isNewConversation, setIsNewConversation] = useState(false);

  const handleSelectConversation = (slug: string) => {
    setCurrentView("chat");
    setIsNewConversation(false);
    return slug;
  };

  const handleNewConversation = () => {
    setCurrentView("chat");
    setIsNewConversation(true);
  };

  return {
    currentView,
    isNewConversation,
    setCurrentView,
    setIsNewConversation,
    handleSelectConversation,
    handleNewConversation,
  };
}
