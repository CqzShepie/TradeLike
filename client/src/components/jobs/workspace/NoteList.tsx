import { useState } from "react";

import Button from "../../ui/Button";
import Input from "../../ui/Input";
import Modal from "../../ui/Modal";

import NoteItem from "./NoteItem";

import type { Note } from "../../../types/note";

type Props = {
  notes: Note[];
  onUpdate: (id: number, text: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

function NoteList({
  notes,
  onUpdate,
  onDelete,
}: Props) {
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [text, setText] = useState("");

  const [deletingNote, setDeletingNote] = useState<Note | null>(null);

  async function handleSave() {
    if (!editingNote) return;

    await onUpdate(editingNote.id, text);

    setEditingNote(null);
    setText("");
  }

  async function handleDelete() {
    if (!deletingNote) return;

    await onDelete(deletingNote.id);

    setDeletingNote(null);
  }

  return (
    <>
      <div className="max-h-96 overflow-y-auto space-y-4 pr-2">
        {notes.length === 0 ? (
          <p className="text-slate-500">
            No notes yet.
          </p>
        ) : (
          notes.map((note) =>
            editingNote?.id === note.id ? (
              <div
                key={note.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingNote(null);
                      setText("");
                    }}
                  >
                    Cancel
                  </Button>

                  <Button onClick={handleSave}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <NoteItem
                key={note.id}
                note={note}
                onEdit={(note) => {
                  setEditingNote(note);
                  setText(note.text);
                }}
                onDelete={() => setDeletingNote(note)}
              />
            )
          )
        )}
      </div>

      {deletingNote && (
        <Modal
          title="Delete Note"
          onClose={() => setDeletingNote(null)}
        >
          <p className="mb-6 text-slate-600">
            Are you sure you want to delete this note?
          </p>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setDeletingNote(null)}
            >
              Cancel
            </Button>

            <Button onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export default NoteList;