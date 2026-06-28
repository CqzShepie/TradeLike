import Card from "../../ui/Card";

import AddNoteForm from "./AddNoteForm";
import NoteList from "./NoteList";

import { useNotes } from "../../../hooks/useNotes";

type Props = {
  jobId: number;
};

function NotesCard({ jobId }: Props) {
  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
  } = useNotes(jobId);

  return (
    <Card>
      <h2 className="mb-6 text-xl font-semibold">
        Notes
      </h2>

      <NoteList
        notes={notes}
        onUpdate={updateNote}
        onDelete={deleteNote}
      />

      <div className="mt-6 border-t border-slate-200 pt-6">
        <AddNoteForm onAdd={addNote} />
      </div>
    </Card>
  );
}

export default NotesCard;