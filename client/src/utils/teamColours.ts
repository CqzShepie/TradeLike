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
  { value: "brown", label: "Brown", hex: "#92400e", softHex: "#fef3c7" },
  { value: "indigo", label: "Indigo", hex: "#4f46e5", softHex: "#e0e7ff" },
  { value: "sky", label: "Sky", hex: "#0284c7", softHex: "#e0f2fe" },
];

export function getTeamColour(value?: string | null) {
  const normalised = value?.trim().toLowerCase();
  const matched = teamColours.find(colour => colour.value === normalised) ?? teamColours[0];

  if (!usesAccessiblePalette()) {
    return matched;
  }

  const accessibleHex: Record<string, string> = {
    blue: "#0072b2",
    green: "#009e73",
    purple: "#cc79a7",
    amber: "#e69f00",
    red: "#d55e00",
    slate: "#374151",
    cyan: "#56b4e9",
    teal: "#00897b",
    emerald: "#006d5b",
    lime: "#7f8c00",
    orange: "#f0a202",
    rose: "#b83280",
    pink: "#a23e8c",
    brown: "#8b5e34",
    indigo: "#332288",
    sky: "#44aa99",
  };

  return { ...matched, hex: accessibleHex[matched.value] ?? matched.hex };
}

export function getTeamColourLabel(value?: string | null) {
  return getTeamColour(value).label;
}

function usesAccessiblePalette() {
  try {
    return JSON.parse(localStorage.getItem("tradelike_accessibility_preferences") ?? "{}").colourBlindFriendly === true;
  } catch {
    return false;
  }
}
