import { formatLongDate } from "./inputFormatters";

export function splitStoredNotes(value?: string | null) {
  return (value ?? "").split(/\n+/).map(note => note.trim()).filter(Boolean);
}

export function createStoredNote(author: string, body: string) {
  return `[note:${new Date().toISOString()}:${author.replace(/\]/g, "")}] ${body.replace(/\s+/g, " ")}`;
}

export function parseStoredNote(note: string) {
  const stored = /^\[note:(.*?):(.*?)\]\s*(.*)$/.exec(note);
  if (stored) {
    return {
      author: stored[2] || "Unknown employee",
      dateLabel: formatLongDate(stored[1]),
      body: stored[3] || "",
    };
  }

  const legacy = /^(.*?)\s+—\s+(.*)$/.exec(note);
  if (legacy) {
    return {
      author: "Unknown employee",
      dateLabel: formatLongDate(parseLegacyDate(legacy[1])),
      body: legacy[2] || "",
    };
  }

  return { author: "Unknown employee", dateLabel: "Date not recorded", body: note };
}

function parseLegacyDate(value: string) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(value.trim());
  if (!match) return value;
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}
