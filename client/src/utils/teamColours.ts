export type TeamColour = {
  value: string;
  label: string;
  hex: string;
  softHex: string;
};

export const teamColours: TeamColour[] = [
  { value: "blue", label: "Blue", hex: "#2563eb", softHex: "#dbeafe" },
  { value: "green", label: "Green", hex: "#16a34a", softHex: "#dcfce7" },
  { value: "purple", label: "Purple", hex: "#7c3aed", softHex: "#ede9fe" },
  { value: "amber", label: "Amber", hex: "#d97706", softHex: "#fef3c7" },
  { value: "red", label: "Red", hex: "#dc2626", softHex: "#fee2e2" },
  { value: "slate", label: "Slate", hex: "#475569", softHex: "#e2e8f0" },
  { value: "cyan", label: "Cyan", hex: "#0891b2", softHex: "#cffafe" },
  { value: "teal", label: "Teal", hex: "#0d9488", softHex: "#ccfbf1" },
  { value: "emerald", label: "Emerald", hex: "#059669", softHex: "#d1fae5" },
  { value: "lime", label: "Lime", hex: "#65a30d", softHex: "#ecfccb" },
  { value: "orange", label: "Orange", hex: "#ea580c", softHex: "#ffedd5" },
  { value: "rose", label: "Rose", hex: "#e11d48", softHex: "#ffe4e6" },
  { value: "pink", label: "Pink", hex: "#db2777", softHex: "#fce7f3" },
  { value: "fuchsia", label: "Fuchsia", hex: "#c026d3", softHex: "#fae8ff" },
  { value: "indigo", label: "Indigo", hex: "#4f46e5", softHex: "#e0e7ff" },
  { value: "sky", label: "Sky", hex: "#0284c7", softHex: "#e0f2fe" },
];

export function getTeamColour(value?: string | null) {
  const normalised = value?.trim().toLowerCase();
  return teamColours.find(colour => colour.value === normalised) ?? teamColours[0];
}

export function getTeamColourLabel(value?: string | null) {
  return getTeamColour(value).label;
}
