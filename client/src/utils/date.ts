export function formatNoteDate(date: Date) {
  const now = new Date();

  const isToday =
    date.toDateString() === now.toDateString();

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday • ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  if (isToday) {
    return `Today • ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  }) +
    " • " +
    date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
}