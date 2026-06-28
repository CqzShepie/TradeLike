import type { Note } from "../types/note";

let notes: Note[] = [
  {
    id: 1,
    jobId: 1,
    author: "Office",
    text: "Customer requested a morning appointment.",
    createdAt: "2026-06-28T08:30:00",
  },
  {
    id: 2,
    jobId: 1,
    author: "Michael",
    text: "Replacement part ordered.",
    createdAt: "2026-06-28T11:10:00",
  },
];

export const notesService = {
  async getByJobId(jobId: number): Promise<Note[]> {
    return notes.filter((n) => n.jobId === jobId);
  },

  async add(jobId: number, text: string): Promise<Note> {
    const note: Note = {
      id: Date.now(),
      jobId,
      author: "You",
      text,
      createdAt: new Date().toISOString(),
    };

    notes.unshift(note);

    return note;
  },

  async update(id: number, text: string): Promise<void> {
    const note = notes.find((n) => n.id === id);

    if (!note) return;

    note.text = text;
  },

  async delete(id: number): Promise<void> {
    notes = notes.filter((n) => n.id !== id);
  },
};