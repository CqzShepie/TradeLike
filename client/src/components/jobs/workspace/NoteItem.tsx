import type { Note } from "../../../types/note";

import DropdownMenu from "../../ui/DropdownMenu";
import { formatNoteDate } from "../../../utils/date";

type Props = {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: number) => void;
};

function NoteItem({
  note,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-slate-900">
            {note.author}
          </h4>

          <p className="text-xs text-slate-500">
            {formatNoteDate(new Date(note.createdAt))}
          </p>
        </div>

        <DropdownMenu
          items={[
            {
              label: "Edit Note",
              onClick: () => onEdit(note),
            },
            {
              label: "Delete Note",
              danger: true,
              onClick: () => onDelete(note.id),
            },
          ]}
        />
      </div>

      <p className="mt-4 whitespace-pre-wrap text-slate-700">
        {note.text}
      </p>
    </div>
  );
}

export default NoteItem;