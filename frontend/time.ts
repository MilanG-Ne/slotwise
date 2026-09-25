export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function formatDay(
  date: string,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "long",
    day: "numeric",
  },
) {
  return new Intl.DateTimeFormat("en-GB", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
export function clock(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: timezone,
  }).format(new Date(iso));
}
export function minuteOfDay(iso: string, timezone: string) {
  const [h, m] = clock(iso, timezone).split(":").map(Number);
  return h * 60 + m;
}
export function dateInZone(iso: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: timezone,
  }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export const timeOptions = Array.from(
  { length: 24 },
  (_, i) =>
    `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
);
