import { useState } from "react";
import type { LinterUpdate } from "@/app/types/global";
import TipTapEditor from "@/components/tiptap/editor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type LinterFormProps = {
  linter: LinterUpdate;
  onSubmit: (linter: LinterUpdate) => void;
  onCancel: () => void;
  autoFocusBefore?: boolean;
};

const LinterForm = ({ linter, onSubmit, onCancel, autoFocusBefore = false }: LinterFormProps) => {
  const [currentLinter, setCurrentLinter] = useState<LinterUpdate>(linter);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(currentLinter);
      }}
    >
      <div className="border rounded-lg p-4 grid gap-4">
        <div>
          <Label>Before</Label>
          <div className="min-h-[10rem]">
            <TipTapEditor
              ariaLabel="Linter before"
              defaultContent={{ content: currentLinter.before ?? "" }}
              autoFocus={autoFocusBefore}
              onUpdate={(content) => setCurrentLinter((prev: LinterUpdate) => ({ ...prev, before: content }))}
            />
          </div>
        </div>
        <div>
          <Label>After</Label>
          <div className="min-h-[10rem]">
            <TipTapEditor
              ariaLabel="Linter after"
              defaultContent={{ content: currentLinter.after ?? "" }}
              onUpdate={(content) => setCurrentLinter((prev: LinterUpdate) => ({ ...prev, after: content }))}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </div>
    </form>
  );
};

export default LinterForm;
