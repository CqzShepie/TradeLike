import { useState } from "react";

import Button from "../../ui/Button";

type Props = {
  onAdd: (text: string) => Promise<void>;
};

function AddNoteForm({ onAdd }: Props) {
  const [text, setText] = useState("");

  async function handleSubmit() {
    if (!text.trim()) return;

    await onAdd(text);

    setText("");
  }

  return (
    <div className="space-y-4">
      <textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write a note..."
        className="w-full rounded-xl border border-slate-300 p-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex justify-end">
        <Button onClick={handleSubmit}>
          Add Note
        </Button>
      </div>
    </div>
  );
}

export default AddNoteForm;