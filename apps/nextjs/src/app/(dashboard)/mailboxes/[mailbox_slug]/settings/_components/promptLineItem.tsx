import { TrashIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef } from "react";
import type { PromptLineUpdate } from "@/app/types/global";
import { Button } from "@/components/ui/button";

type PromptLineItemProps = {
  promptLine: PromptLineUpdate;
  onChange: (pendingUpdate: Partial<PromptLineUpdate>) => void;
  onDelete: () => void;
  autoFocus?: boolean;
  isNew?: boolean;
};

const PromptLineItem = ({ promptLine, onChange, onDelete, autoFocus, isNew }: PromptLineItemProps) => {
  const editableRef = useRef<HTMLDivElement>(null);
  const handleChange = (content: string) => {
    const isDirty = (isNew && content) || promptLine.content !== content;
    if (isDirty) {
      onChange({ lineIndex: promptLine.lineIndex, content });
    } else {
      onChange({});
    }
  };

  const expandEditable = () => {
    if (!editableRef.current) return;
    const el = editableRef.current;
    el.classList.add("whitespace-normal");
    el.style.setProperty("height", `${el.scrollHeight}px`);
    el.classList.remove("h-10");
    setTimeout(() => el.style.removeProperty("height"), 300);
  };

  const collapseEditable = () => {
    if (!editableRef.current) return;
    const el = editableRef.current;
    el.style.setProperty("height", `${el.scrollHeight}px`);
    el.classList.add("h-10");
    setTimeout(() => {
      el.style.removeProperty("height");
      el.classList.remove("whitespace-normal");
    }, 0);
  };

  useEffect(() => {
    if (editableRef.current && autoFocus) {
      editableRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <div className="mb-2 flex gap-2">
      <div
        ref={editableRef}
        className="transition-height h-10 w-full truncate rounded-lg border border-border px-3 py-2 text-sm outline-none duration-300 focus:border-border focus:outline-none"
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => handleChange(e.currentTarget.textContent || "")}
        onFocus={() => expandEditable()}
        onBlur={() => collapseEditable()}
        onPaste={(e) => {
          e.preventDefault();
          const text = e.clipboardData.getData("text/plain");
          const selection = window.getSelection();
          if (!selection?.rangeCount) return;

          const range = selection.getRangeAt(0);
          const textNode = document.createTextNode(text);
          range.deleteContents();
          range.insertNode(textNode);
          range.collapse();

          handleChange(e.currentTarget.textContent || "");
        }}
      >
        {promptLine.content}
      </div>
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        onClick={(e) => {
          e.preventDefault();
          onDelete();
        }}
      >
        <TrashIcon className="h-4 w-4" />
        <span className="sr-only">Delete</span>
      </Button>
    </div>
  );
};

export default PromptLineItem;
