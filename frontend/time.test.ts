import { describe, expect, it } from "vitest";
import { addDays, clock, dateInZone, minuteOfDay } from "./time";
describe("workspace time", () => {
  it("crosses month and leap-day boundaries without local timezone arithmetic", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("uses the workspace timezone in summer and winter", () => {
    expect(clock("2026-09-26T08:00:00Z", "Europe/Belgrade")).toBe("10:00");
    expect(clock("2026-10-25T08:00:00Z", "Europe/Belgrade")).toBe("09:00");
  });
  it("places half-hour bookings on the schedule", () => {
    expect(minuteOfDay("2026-09-26T08:30:00Z", "Europe/Belgrade")).toBe(630);
  });
  it("groups UTC timestamps by their workspace day", () => {
    expect(dateInZone("2026-09-25T23:30:00Z", "Europe/Belgrade")).toBe(
      "2026-09-26",
    );
  });
});
