import { createStoredNote, parseStoredNote } from "./jobNotes";

describe("job note parsing", () => {
  it("creates structured notes without duplicating raw timestamps in the body", () => {
    const stored = createStoredNote("Alex Engineer", "Checked boiler pressure");
    const parsed = parseStoredNote(stored);

    expect(parsed.author).toBe("Alex Engineer");
    expect(parsed.body).toBe("Checked boiler pressure");
    expect(parsed.body).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("does not promote missing metadata as Unknown employee or Date not recorded", () => {
    const parsed = parseStoredNote("Loose legacy note text");

    expect(parsed.author).toBe("Team member not recorded");
    expect(parsed.dateLabel).toBe("");
    expect(parsed.author).not.toBe("Unknown employee");
    expect(parsed.dateLabel).not.toBe("Date not recorded");
  });
});
