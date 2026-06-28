import { useEffect, useState } from "react";

import type { Note } from "../types/note";
import { notesService } from "../services/notesService";

export function useNotes(jobId: number) {
  const [notes, setNotes] = useState<Note[]>([]);

  async function loadNotes() {
    const data = await notesService.getByJobId(jobId);
    setNotes(data);
  }

  async function addNote(text: string) {
    await notesService.add(jobId, text);
    await loadNotes();
  }

  async function updateNote(id: number, text: string) {
    await notesService.update(id, text);
    await loadNotes();
  }

  async function deleteNote(id: number) {
    await notesService.delete(id);
    await loadNotes();
  }

  useEffect(() => {
    loadNotes();
  }, [jobId]);

  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
    refresh: loadNotes,
  };
}